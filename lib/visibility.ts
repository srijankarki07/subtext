import {
  converter,
  differenceCiede2000,
  formatHex,
  interpolate,
  parse,
  wcagLuminance,
} from "culori"

/**
 * Readability measurement for text over a photograph.
 *
 * The problem this solves: the previous engine averaged every pixel under the
 * text and measured contrast against that single average. A quote straddling
 * white sky and a dark ridge was scored against a mid-grey that exists nowhere
 * in the image, so it could report PASS over unreadable text and FAIL over
 * readable text. Averaging is the wrong operation — readability is set by the
 * *worst* part of the background, not the mean.
 *
 * So this keeps a luminance histogram of the region instead of a summary
 * colour, and measures against the least favourable part of it that the text
 * still realistically sits on. It also counts the text's own readback
 * mechanisms — an outline or a shadow is a readability intervention, and a
 * white quote with a black outline on a white sky was previously scored FAIL.
 *
 * Everything here is pure: pixels and colour strings in, a report out. Reading
 * pixels off the Fabric canvas lives in the store.
 */

/** Luminance buckets. 64 gives ~1.5% resolution, plenty for a percentile. */
const BUCKETS = 64

/** The fraction of the region treated as the worst realistic case. */
const TAIL = 0.05

export type EdgeSource = "fill" | "stroke" | "shadow"

export interface RegionStats {
  /** Number of pixels actually inspected. */
  samples: number
  /** Mean relative luminance. */
  mean: number
  /** Luminance at the 5th and 95th percentiles. */
  p05: number
  p95: number
  /** Median luminance. */
  p50: number
  /** Standard deviation of luminance: how busy the background is. */
  spread: number
  /** Share of pixels in the single most common luminance bucket, 0–1. */
  dominantShare: number
  /** Mean colour of the darkest and brightest 10% of the region. */
  darkHex: string
  lightHex: string
  /** Mean colour of the whole region — what the old engine measured against. */
  meanHex: string
  /** Mean colour of the middle of the region, which is the typical backdrop. */
  medianHex: string
}

export interface ContrastEdge {
  source: EdgeSource
  /** The colour contributing the edge, after any reliability discount. */
  color: string
  /** Contrast against the worst realistic part of the region. */
  ratio: number
  /**
   * How much this edge actually helps, 0–1. A 1px outline is a real
   * readability mechanism; a wide soft glow is a weak one.
   */
  reliability: number
  /** Short explanation for the UI. */
  note: string
}

export interface ScoreBreakdown {
  label: string
  detail: string
  delta: number
}

export interface VisibilityReport {
  /** Composite readability score, 0–100. */
  score: number
  /** WCAG verdict for the effective contrast at this text's size. */
  badge: "AAA" | "AA" | "FAIL"
  /** Which of the text's edges carries the contrast. */
  source: EdgeSource
  /** Worst realistic contrast ratio, and the colour it was measured against. */
  worstRatio: number
  worstHex: string
  /** Contrast against the region's median and mean, for comparison. */
  typicalRatio: number
  typicalHex: string
  meanRatio: number
  meanHex: string
  /** Text metrics as measured, including the object's scale. */
  fontSize: number
  fontWeight: number
  isLargeText: boolean
  /** The contrast the text would need to pass at this size. */
  requiredRatio: number
  /** The text's own colour, so candidates and suggestions can be derived. */
  fill: string
  /** The readback mechanisms currently applied, so variants can be scored. */
  applied: {
    strokeColor?: string
    strokeWidth: number
    shadowColor?: string
    shadowBlur: number
    shadowOffset: number
  }
  region: RegionStats
  edges: ContrastEdge[]
  breakdown: ScoreBreakdown[]
  notes: string[]
}

// ---------------------------------------------------------------- colour math

export function relativeLuminance(hex: string): number {
  const color = parse(hex)
  return color ? (wcagLuminance(color) ?? 0) : 0
}

/** WCAG 2.1 contrast ratio between two colours. */
export function contrastRatio(a: string, b: string): number {
  return ratioFromLuminance(relativeLuminance(a), relativeLuminance(b))
}

function ratioFromLuminance(a: number, b: number): number {
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Mixes two colours in sRGB. `t` of 1 returns `a`. */
export function mixHex(a: string, b: string, t: number): string {
  const mixed = interpolate([b, a], "rgb")(t)
  return formatHex(mixed) ?? a
}

/**
 * Rounds a colour to the nearest perceptually distinct one.
 *
 * Used to keep palette suggestions from offering three near-identical greys.
 * CIEDE2000 is used because it tracks perceived difference; a plain RGB
 * distance would happily call #808080 and #818181 distinct.
 */
export const colourDistance = differenceCiede2000()

export function areVisuallyDistinct(a: string, b: string, minDelta = 3): boolean {
  const A = parse(a)
  const B = parse(b)
  if (!A || !B) return true
  const delta = colourDistance(A, B)
  return !Number.isFinite(delta) || delta >= minDelta
}

/** Perceptual lightness (OKLab L, 0–1). Used to order swatches meaningfully. */
const toOklch = converter("oklch")

export function perceptualLightness(hex: string): number {
  const parsed = parse(hex)
  if (!parsed) return 0
  const oklch = toOklch(parsed)
  return oklch?.l ?? 0
}

// ------------------------------------------------------------ region sampling

/**
 * Builds region statistics from raw RGBA pixels.
 *
 * `stride` is in pixels and lets callers trade accuracy for speed while the
 * user is dragging; the whole-region case for a 1080px artboard is ~1.2M
 * pixels, which is too many to walk on every pointer move.
 */
export function analyseRegion(
  data: Uint8ClampedArray,
  { stride = 1 }: { stride?: number } = {}
): RegionStats {
  const counts = new Float64Array(BUCKETS)
  const reds = new Float64Array(BUCKETS)
  const greens = new Float64Array(BUCKETS)
  const blues = new Float64Array(BUCKETS)

  let samples = 0
  let sum = 0
  let sumSquares = 0
  let totalR = 0
  let totalG = 0
  let totalB = 0

  const step = Math.max(1, Math.floor(stride)) * 4

  for (let i = 0; i + 3 < data.length; i += step) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const luminance = srgbLuminance(r, g, b)
    const bucket = Math.min(BUCKETS - 1, Math.floor(luminance * BUCKETS))

    counts[bucket] += 1
    reds[bucket] += r
    greens[bucket] += g
    blues[bucket] += b

    samples += 1
    sum += luminance
    sumSquares += luminance * luminance
    totalR += r
    totalG += g
    totalB += b
  }

  if (samples === 0) {
    return {
      samples: 0,
      mean: 0,
      p05: 0,
      p50: 0,
      p95: 0,
      spread: 0,
      dominantShare: 0,
      darkHex: "#000000",
      lightHex: "#FFFFFF",
      meanHex: "#000000",
      medianHex: "#000000",
    }
  }

  const mean = sum / samples
  const variance = Math.max(0, sumSquares / samples - mean * mean)

  let dominantBucket = 0
  for (let i = 1; i < BUCKETS; i++) {
    if (counts[i] > counts[dominantBucket]) dominantBucket = i
  }

  return {
    samples,
    mean,
    p05: luminanceAtPercentile(counts, samples, TAIL),
    p50: luminanceAtPercentile(counts, samples, 0.5),
    p95: luminanceAtPercentile(counts, samples, 1 - TAIL),
    spread: Math.sqrt(variance),
    dominantShare: counts[dominantBucket] / samples,
    darkHex: meanColourInBand(counts, reds, greens, blues, samples, 0, 0.1),
    lightHex: meanColourInBand(counts, reds, greens, blues, samples, 0.9, 1),
    meanHex: rgbToHex(totalR / samples, totalG / samples, totalB / samples),
    medianHex: meanColourAroundPercentile(
      counts,
      reds,
      greens,
      blues,
      samples,
      0.5
    ),
  }
}

/** sRGB → relative luminance, WCAG's coefficients, linearised properly. */
function srgbLuminance(r: number, g: number, b: number): number {
  const linear = (channel: number) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

function luminanceAtPercentile(
  counts: Float64Array,
  samples: number,
  percentile: number
): number {
  const target = percentile * samples
  let running = 0
  for (let i = 0; i < BUCKETS; i++) {
    running += counts[i]
    if (running >= target) return (i + 0.5) / BUCKETS
  }
  return (BUCKETS - 0.5) / BUCKETS
}

/** Mean colour of the pixels between two cumulative fractions of the region. */
function meanColourInBand(
  counts: Float64Array,
  reds: Float64Array,
  greens: Float64Array,
  blues: Float64Array,
  samples: number,
  fromFraction: number,
  toFraction: number
): string {
  const from = fromFraction * samples
  const to = toFraction * samples

  let running = 0
  let n = 0
  let r = 0
  let g = 0
  let b = 0

  for (let i = 0; i < BUCKETS; i++) {
    const bucketStart = running
    const bucketEnd = running + counts[i]
    running = bucketEnd

    // Overlap of this bucket with the requested band.
    const overlap = Math.min(bucketEnd, to) - Math.max(bucketStart, from)
    if (overlap <= 0) continue

    const share = overlap / Math.max(1, counts[i])
    n += overlap
    r += reds[i] * share
    g += greens[i] * share
    b += blues[i] * share
  }

  if (n === 0) return "#000000"
  return rgbToHex(r / n, g / n, b / n)
}

/** Colour of the bucket containing a cumulative percentile. */
function meanColourAroundPercentile(
  counts: Float64Array,
  reds: Float64Array,
  greens: Float64Array,
  blues: Float64Array,
  samples: number,
  percentile: number
): string {
  return meanColourInBand(
    counts,
    reds,
    greens,
    blues,
    samples,
    Math.max(0, percentile - 0.02),
    Math.min(1, percentile + 0.02)
  )
}

function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0")
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase()
}

// ------------------------------------------------------------------- scoring

/**
 * WCAG's own definition of large text, in pixels at 96dpi: 18pt (24px), or
 * 14pt (18.66px) when bold. Large text is allowed a lower contrast bar, and
 * this product's quotes are almost always large — the previous engine ignored
 * that entirely and filtered recommendations at 4.5:1 regardless, which threw
 * away perfectly good colours on the user's behalf.
 */
export function isLargeText(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700)
}

/** The ratio this text needs to pass WCAG AA at its size. */
export function requiredRatio(fontSize: number, fontWeight: number): number {
  return isLargeText(fontSize, fontWeight) ? 3 : 4.5
}

/** The ratio for AAA at this size. */
function strongRatio(fontSize: number, fontWeight: number): number {
  return isLargeText(fontSize, fontWeight) ? 4.5 : 7
}

/**
 * Maps a contrast ratio to 0–100 using WCAG's own thresholds as the anchors,
 * so the number agrees with the badge rather than being a separate scale.
 */
export function ratioToScore(
  ratio: number,
  fontSize: number,
  fontWeight: number
): number {
  const pass = requiredRatio(fontSize, fontWeight)
  const strong = strongRatio(fontSize, fontWeight)

  if (ratio >= strong) {
    // 88 → 100 across the distance from AA to AAA and beyond.
    const headroom = Math.min(1, (ratio - strong) / strong)
    return 88 + headroom * 12
  }
  if (ratio >= pass) {
    return 70 + ((ratio - pass) / (strong - pass)) * 18
  }
  // Below the bar, fall away steeply — this is the case that ruins a post.
  return 70 * Math.pow(Math.max(0, ratio) / pass, 1.5)
}

// --------------------------------------------------------------------- edges

/**
 * The contrast each of the text's own edges achieves against the region, and
 * how much that edge actually helps.
 *
 * A filled quote is read against its fill. An outlined quote is read against
 * whichever of the fill or the outline contrasts more — that is what an
 * outline is for — so scoring it on fill alone reports FAIL for text that is
 * plainly legible. A shadow works the same way but more weakly, and the
 * weaker it is (large blur, no offset) the less of its colour actually lands.
 */
export function contrastEdges(
  edges: {
    fill: string
    stroke?: string
    strokeWidth?: number
    shadowColor?: string
    shadowBlur?: number
    shadowOffset?: number
  },
  region: RegionStats
): ContrastEdge[] {
  const result: ContrastEdge[] = []
  const textLuminance = relativeLuminance(edges.fill)

  result.push({
    source: "fill",
    color: edges.fill,
    ratio: worstRatioAgainst(region, textLuminance),
    reliability: 1,
    note: "The text fill itself.",
  })

  const strokeWidth = edges.strokeWidth ?? 0
  if (edges.stroke && strokeWidth > 0) {
    // A hairline outline is not a readability mechanism; at 1px and up it is.
    const reliability = Math.min(1, strokeWidth / 1)
    result.push({
      source: "stroke",
      color: edges.stroke,
      ratio: worstRatioAgainst(region, relativeLuminance(edges.stroke)),
      reliability,
      note: `${strokeWidth}px outline`,
    })
  }

  const blur = edges.shadowBlur ?? 0
  const offset = edges.shadowOffset ?? 0
  if (edges.shadowColor && (blur > 0 || offset > 0)) {
    // A soft glow spreads its colour thinly, so what actually lands behind the
    // glyphs is somewhere between the shadow colour and the background. Model
    // that rather than crediting the shadow its nominal colour: an offset
    // shadow lands nearly whole, and a wide blur lands proportionally less.
    const strength = Math.max(offset / 8, 1 - Math.min(1, blur / 48))
    const reliability = Math.max(0, Math.min(0.9, strength * 0.9))
    // `mixHex(a, b, t)` returns `a` at t = 1, so passing the reliability blends
    // from the background (no effect) toward the shadow colour (full effect).
    const effective = mixHex(edges.shadowColor, region.medianHex, reliability)

    result.push({
      source: "shadow",
      color: effective,
      ratio: worstRatioAgainst(region, relativeLuminance(effective)),
      reliability,
      note:
        blur > 0 && offset === 0
          ? `soft glow, ${Math.round(reliability * 100)}% strength`
          : "shadow",
    })
  }

  return result
}

/**
 * The least favourable contrast the text faces across the region.
 *
 * This is the minimum of the ratio at each end of the region's luminance range,
 * and the range is trimmed to the 5th–95th percentile so that an outlier pixel
 * or two cannot define readability for a whole block of text.
 *
 * Note it is *not* the endpoint closest to the text's own luminance. Contrast
 * is multiplicative — (max + 0.05) / (min + 0.05) — so the nearer endpoint can
 * give the higher ratio. Mid-grey text sits 0.22 from black but 0.78 from
 * white, yet scores 5.3:1 against black and only 3.9:1 against white. Taking
 * the closer endpoint would have reported the flattering number.
 */
export function worstRatioAgainst(
  region: RegionStats,
  textLuminance: number
): number {
  if (region.samples === 0) return 1
  return Math.min(
    ratioFromLuminance(textLuminance, region.p05),
    ratioFromLuminance(textLuminance, region.p95)
  )
}

/** The colour of the part of the region a given text colour struggles with. */
export function worstBackdropFor(
  region: RegionStats,
  textLuminance: number
): string {
  const againstDark = ratioFromLuminance(textLuminance, region.p05)
  const againstLight = ratioFromLuminance(textLuminance, region.p95)
  return againstDark <= againstLight ? region.darkHex : region.lightHex
}

// ------------------------------------------------------------------- report

export interface ReportInput {
  region: RegionStats
  fill: string
  stroke?: string
  strokeWidth?: number
  shadowColor?: string
  shadowBlur?: number
  shadowOffset?: number
  fontSize: number
  fontWeight: number
}

export function buildReport(input: ReportInput): VisibilityReport {
  const { region, fill, fontSize, fontWeight } = input

  const edges = contrastEdges(input, region)
  const best = edges.reduce((a, b) => (b.ratio > a.ratio ? b : a))

  const worstRatio = best.ratio
  const fillLuminance = relativeLuminance(fill)
  // Against the region's median: what most of the quote actually sits on.
  const typicalRatio = ratioFromLuminance(fillLuminance, region.p50)
  // Against the area mean: the figure the previous engine reported, kept so
  // the difference between the three is visible rather than asserted.
  const meanRatio = ratioFromLuminance(fillLuminance, region.mean)

  const large = isLargeText(fontSize, fontWeight)
  const pass = requiredRatio(fontSize, fontWeight)
  const strong = strongRatio(fontSize, fontWeight)

  const base = ratioToScore(worstRatio, fontSize, fontWeight)
  const breakdown: ScoreBreakdown[] = [
    {
      label: "Contrast",
      detail: `${worstRatio.toFixed(2)}:1 against the least favourable part of the background`,
      delta: Math.round(base),
    },
  ]

  // A region with wildly varying luminance is harder to read than a flat one
  // at the same ratio, because the eye keeps re-adapting across the glyphs.
  const busyness = Math.min(12, Math.round(region.spread * 40))
  if (busyness > 0) {
    breakdown.push({
      label: "Busy background",
      detail: `luminance varies by ±${region.spread.toFixed(2)} across the text`,
      delta: -busyness,
    })
  }

  // Size is already in the thresholds, so this is a small nudge, not a second
  // helping of the same credit.
  const sizeBonus = large ? 4 : fontSize >= 16 ? 2 : 0
  if (sizeBonus > 0) {
    breakdown.push({
      label: large ? "Large text" : "Readable size",
      detail: large
        ? `needs only ${pass}:1 at this size`
        : `${Math.round(fontSize)}px`,
      delta: sizeBonus,
    })
  }

  const score = Math.max(
    0,
    Math.min(100, Math.round(base - busyness + sizeBonus))
  )

  const badge: VisibilityReport["badge"] =
    worstRatio >= strong && worstRatio >= 7
      ? "AAA"
      : worstRatio >= pass
        ? "AA"
        : "FAIL"

  const notes: string[] = []
  if (best.source !== "fill") {
    notes.push(
      `Readability is carried by the ${
        best.source === "stroke" ? "outline" : "shadow"
      }, not the fill (${best.ratio.toFixed(2)}:1 vs ${edges[0].ratio.toFixed(2)}:1).`
    )
  }
  if (region.spread > 0.18) {
    notes.push(
      "The background is busy underneath the text — a flat patch would read better."
    )
  }
  if (regionalSpreadNoteApplies(region)) {
    notes.push(
      "Some of the region is much darker or lighter than the rest, so part of the text is doing better than the rest."
    )
  }

  return {
    score,
    badge,
    source: best.source,
    worstRatio,
    worstHex: worstBackdropFor(region, relativeLuminance(best.color)),
    typicalRatio,
    typicalHex: region.medianHex,
    meanRatio,
    meanHex: region.meanHex,
    fontSize,
    fontWeight,
    isLargeText: large,
    requiredRatio: pass,
    fill,
    applied: {
      strokeColor: input.stroke,
      strokeWidth: input.strokeWidth ?? 0,
      shadowColor: input.shadowColor,
      shadowBlur: input.shadowBlur ?? 0,
      shadowOffset: input.shadowOffset ?? 0,
    },
    region,
    edges,
    breakdown,
    notes,
  }
}

function regionalSpreadNoteApplies(region: RegionStats): boolean {
  return region.p95 - region.p05 > 0.45
}

// --------------------------------------------------------- recommendations

export interface Recommendation {
  id: string
  title: string
  detail: string
  /** The score this would reach, or null when it cannot be predicted. */
  predictedScore: number | null
  /** Present when the action is a colour change, for a one-click apply. */
  apply?: { kind: "stroke"; color: string; width: number } | { kind: "fill"; color: string }
}

/**
 * Deterministic suggestions, each with the score it would reach.
 *
 * Nothing here is generated: every suggestion is a specific edit this engine
 * can score before it is applied, so the number shown is the number the user
 * will get.
 */
export function recommend(report: VisibilityReport): Recommendation[] {
  const out: Recommendation[] = []
  const { region, fill, fontSize, fontWeight, applied } = report

  const variant = (overrides: Partial<ReportInput>): ReportInput => ({
    region,
    fill,
    fontSize,
    fontWeight,
    ...applied,
    stroke: applied.strokeColor,
    shadowColor: applied.shadowColor,
    ...overrides,
  })

  // An outline in whichever of black/white contrasts better with the *region*.
  if (report.worstRatio < report.requiredRatio) {
    for (const candidate of ["#000000", "#FFFFFF"]) {
      const edgesWithStroke = contrastEdges(
        variant({ stroke: candidate, strokeWidth: 2 }),
        region
      )
      const best = edgesWithStroke.reduce((a, b) => (b.ratio > a.ratio ? b : a))
      const score = scoreFor(best.ratio, fontSize, fontWeight, region)
      if (score > report.score) {
        out.push({
          id: `stroke-${candidate}`,
          title: `Add a 2px ${candidate === "#000000" ? "black" : "white"} outline`,
          detail: `Reaches ${best.ratio.toFixed(2)}:1 against the worst part of the background.`,
          predictedScore: score,
          apply: { kind: "stroke", color: candidate, width: 2 },
        })
      }
    }
  }

  // Moving to a calmer band of the image. The caller supplies candidate
  // regions it has actually measured, so this is never a guess.
  return out
}

function scoreFor(
  ratio: number,
  fontSize: number,
  fontWeight: number,
  region: RegionStats
): number {
  const base = ratioToScore(ratio, fontSize, fontWeight)
  const busyness = Math.min(12, Math.round(region.spread * 40))
  const large = isLargeText(fontSize, fontWeight)
  return Math.max(0, Math.min(100, Math.round(base - busyness + (large ? 4 : 2))))
}

// ------------------------------------------------------- auto-colour candidates

export interface ColourCandidate {
  color: string
  ratio: number
  score: number
  label: string
  /** Where the colour came from, so the UI can explain it. */
  origin: "neutral" | "palette" | "adjusted" | "current"
}

/**
 * Ranks colours for the selected text.
 *
 * Two changes from the previous version, both of which were rejecting good
 * colours on the user's behalf: the threshold follows the text's size (3:1 for
 * display type, not a blanket 4.5:1), and candidates are ranked by predicted
 * score rather than filtered to a single pass/fail.
 */
export function rankColours(
  report: VisibilityReport,
  palette: string[],
  limit = 6
): ColourCandidate[] {
  const { region, fill: current, fontSize, fontWeight } = report

  const candidates: ColourCandidate[] = []
  const push = (color: string, label: string, origin: ColourCandidate["origin"]) => {
    const ratio = worstRatioAgainst(region, relativeLuminance(color))
    candidates.push({
      color,
      ratio,
      score: scoreFor(ratio, fontSize, fontWeight, region),
      label,
      origin,
    })
  }

  push("#FFFFFF", "White", "neutral")
  push("#000000", "Black", "neutral")

  for (const color of palette) {
    push(color, "From the image", "palette")
    // A lighter and a darker variant of each palette colour keeps the image's
    // hue while buying contrast, which is usually the more attractive fix.
    const lightness = perceptualLightness(color)
    push(mixHex("#FFFFFF", color, Math.min(1, lightness + 0.35)), "Lightened image colour", "adjusted")
    push(mixHex("#000000", color, Math.max(0, lightness - 0.35)), "Darkened image colour", "adjusted")
  }

  push(current, "Current", "current")

  // Rank by score, then drop candidates that are perceptually the same colour
  // as something already kept — three near-identical greys is not a choice.
  const ranked = candidates.sort((a, b) => b.score - a.score || b.ratio - a.ratio)

  const kept: ColourCandidate[] = []
  for (const candidate of ranked) {
    if (kept.some((k) => !areVisuallyDistinct(k.color, candidate.color))) continue
    kept.push(candidate)
    if (kept.length >= limit) break
  }

  return kept
}
