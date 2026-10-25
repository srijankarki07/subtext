/**
 * Tone: levels, a curve, and the histogram that explains both.
 *
 * Brightness and contrast are linear nudges; this is the professional end of
 * grading. Everything here is pure - a tone state in, a 256-entry lookup table
 * out - so the arithmetic that decides what the photograph becomes can be
 * exercised in Node, and the Fabric filter that applies it stays a thin adapter.
 *
 * Order of operations is the one every grading application uses: levels first
 * (stretch the input range), then gamma (move the midpoint), then the curve
 * (shape the response). Applying them in another order produces a different
 * image from the same numbers, so it is written down once, here.
 */

export interface TonePoint {
  /** Input value, 0–1. */
  x: number
  /** Output value, 0–1. */
  y: number
}

export interface ToneState {
  /** Input black point, 0–1. Everything darker becomes black. */
  black: number
  /** Input white point, 0–1. Everything lighter becomes white. */
  white: number
  /** Midtone gamma. 1 is neutral; below 1 brightens the midtones. */
  gamma: number
  /** Control points, endpoints first and last, x ascending. */
  curve: TonePoint[]
}

export const NEUTRAL_TONE: ToneState = {
  black: 0,
  white: 1,
  gamma: 1,
  curve: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
}

/** The most interior points a curve may hold. More is not a curve, it is noise. */
export const MAX_CURVE_POINTS = 8

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Sorted, de-duplicated, endpoint-pinned copy of a point list. */
export function normalizeCurve(points: TonePoint[]): TonePoint[] {
  const sorted = points
    .map((point) => ({ x: clamp01(point.x), y: clamp01(point.y) }))
    .sort((a, b) => a.x - b.x)

  const unique: TonePoint[] = []
  for (const point of sorted) {
    const previous = unique[unique.length - 1]
    if (previous && Math.abs(previous.x - point.x) < 1e-6) continue
    unique.push(point)
  }

  if (unique.length === 0) return [...NEUTRAL_TONE.curve]

  // The endpoints are always the ends of the domain. Their height is preserved
  // when the caller supplied them (a lifted black point is meaningful), and
  // filled in when they only supplied interior points.
  const interior = unique.filter(
    (point) => point.x > 1e-6 && point.x < 1 - 1e-6
  )
  const first = unique[0]
  const last = unique[unique.length - 1]

  return [
    { x: 0, y: first.x <= 1e-6 ? first.y : 0 },
    ...interior,
    { x: 1, y: last.x >= 1 - 1e-6 ? last.y : 1 },
  ]
}

/**
 * Monotone cubic interpolation (Fritsch–Carlson).
 *
 * A plain cubic spline overshoots between points, which on a tone curve means
 * inverting contrast: a point pulled down to lift shadows makes the shadows
 * *darker* just before it. The monotone variant cannot overshoot, so dragging a
 * point does what the picture says it will.
 */
export function sampleCurve(points: TonePoint[], x: number): number {
  const curve = normalizeCurve(points)
  const n = curve.length
  if (n === 0) return clamp01(x)
  if (n === 1) return clamp01(curve[0].y)

  const xs = curve.map((point) => point.x)
  const ys = curve.map((point) => point.y)

  if (x <= xs[0]) return clamp01(ys[0])
  if (x >= xs[n - 1]) return clamp01(ys[n - 1])

  // Secant slopes between neighbouring points.
  const h: number[] = []
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(Math.max(1e-9, xs[i + 1] - xs[i]))
    d.push((ys[i + 1] - ys[i]) / h[i])
  }

  // Tangents, limited so the interpolation stays monotone on each segment.
  const m: number[] = new Array(n)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) {
      m[i] = 0
    } else {
      const w1 = 2 * h[i] + h[i - 1]
      const w2 = h[i] + 2 * h[i - 1]
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    }
  }

  let segment = 0
  while (segment < n - 2 && x > xs[segment + 1]) segment++

  const t = (x - xs[segment]) / h[segment]
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2

  const value =
    h00 * ys[segment] +
    h10 * h[segment] * m[segment] +
    h01 * ys[segment + 1] +
    h11 * h[segment] * m[segment + 1]

  return clamp01(value)
}

/**
 * The lookup table the filter applies.
 *
 * One table for red, green and blue: this is a master curve, the common case.
 * Per-channel curves would need three tables and a second set of controls, and
 * the colour engine already handles tinting.
 */
export function buildToneLut(tone: ToneState): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256)
  const black = clamp01(tone.black)
  const white = clamp01(tone.white)
  const span = Math.max(1e-3, white - black)
  const gamma = Math.max(0.05, tone.gamma)

  for (let i = 0; i < 256; i++) {
    const input = i / 255
    let value = (input - black) / span
    value = clamp01(value)
    value = Math.pow(value, 1 / gamma)
    value = sampleCurve(tone.curve, value)
    lut[i] = Math.round(clamp01(value) * 255)
  }

  return lut
}

/** True when the tone would leave every pixel untouched. */
export function isNeutralTone(tone: ToneState): boolean {
  const lut = buildToneLut(tone)
  for (let i = 0; i < 256; i++) {
    if (lut[i] !== i) return false
  }
  return true
}

/** A copy with one control point moved or added. */
export function moveCurvePoint(
  points: TonePoint[],
  index: number,
  x: number,
  y: number
): TonePoint[] {
  const curve = normalizeCurve(points)
  if (index <= 0 || index >= curve.length - 1) return curve

  // The neighbours set the segment this point may travel within, so points
  // cannot pass each other and create a non-function.
  const left = curve[index - 1].x + 0.01
  const right = curve[index + 1].x - 0.01
  return curve.map((point, at) =>
    at === index
      ? { x: Math.min(right, Math.max(left, clamp01(x))), y: clamp01(y) }
      : point
  )
}

/** Adds an interior point, unless the curve is full. */
export function addCurvePoint(
  points: TonePoint[],
  x: number,
  y: number
): TonePoint[] {
  const curve = normalizeCurve(points)
  if (curve.length >= MAX_CURVE_POINTS) return curve
  if (curve.some((point) => Math.abs(point.x - x) < 0.02)) return curve
  return normalizeCurve([...curve, { x: clamp01(x), y: clamp01(y) }])
}

/** Removes an interior point; the endpoints stay. */
export function removeCurvePoint(
  points: TonePoint[],
  index: number
): TonePoint[] {
  const curve = normalizeCurve(points)
  if (index <= 0 || index >= curve.length - 1) return curve
  return curve.filter((_, at) => at !== index)
}

// -------------------------------------------------------------- histogram

export interface Histogram {
  red: number[]
  green: number[]
  blue: number[]
  luma: number[]
  /** Pixels inspected, for the "n px" readout. */
  total: number
  /** The largest single bin, for scaling the drawing. */
  peak: number
}

/**
 * Channel histograms from raw RGBA.
 *
 * Alpha is skipped: a cutout's transparent pixels are not part of the
 * photograph. `stride` is in pixels and lets the panel sample a few tens of
 * thousands of pixels instead of millions while a curve is being dragged.
 */
export function histogramFromPixels(
  data: Uint8ClampedArray | Uint8Array,
  { stride = 1 }: { stride?: number } = {}
): Histogram {
  const red = new Array(256).fill(0)
  const green = new Array(256).fill(0)
  const blue = new Array(256).fill(0)
  const luma = new Array(256).fill(0)

  let total = 0
  const step = Math.max(1, Math.floor(stride)) * 4

  for (let i = 0; i + 3 < data.length; i += step) {
    if (data[i + 3] < 8) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    red[r] += 1
    green[g] += 1
    blue[b] += 1
    // Rec. 601, the luminance the eye reads.
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    luma[Math.min(255, Math.max(0, y))] += 1
    total += 1
  }

  let peak = 0
  for (let i = 0; i < 256; i++) {
    if (luma[i] > peak) peak = luma[i]
  }

  return { red, green, blue, luma, total, peak }
}
