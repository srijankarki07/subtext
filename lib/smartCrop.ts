/**
 * Choosing which part of a photo to keep.
 *
 * A portrait photo dropped on a square artboard is cropped by definition; the
 * old behaviour always kept the centre, which is the one answer that is wrong
 * as often as it is right. This scores every crop of the target aspect that fits
 * the photo and picks the best: edge energy (where the detail is), entropy (how
 * much tonal variety the crop holds), and a small pull toward the centre so a
 * flat photograph still frames predictably.
 *
 * Pure - pixels in, a window out - so the scoring can be exercised in Node. No
 * face detection: it would be another model download for a marginal gain, and
 * the heuristic is explainable, which is this project's standard for every
 * automatic decision it makes.
 */

export interface CropSource {
  width: number
  height: number
  /** RGBA, sampled at whatever size the adapter chose. */
  data: Uint8ClampedArray
}

export interface CropWindow {
  x: number
  y: number
  width: number
  height: number
}

export interface CropCandidate extends CropWindow {
  /** Mean gradient magnitude inside the window, in luma units. */
  energy: number
  /** Shannon entropy of the window's luminance, in bits. */
  entropy: number
  /** Share of the window that is not transparent, 0–1. */
  coverage: number
  /** 1 at the centre of the photo, 0 at either extreme. */
  centre: number
  /** The combined score the choice is made on, 0–1. */
  score: number
}

export interface CropResult {
  best: CropCandidate
  candidates: CropCandidate[]
}

const HISTOGRAM_BUCKETS = 64
const ALPHA_THRESHOLD = 8
const ENERGY_WEIGHT = 0.7
const ENTROPY_WEIGHT = 0.2
const CENTRE_WEIGHT = 0.1

/** Luma and gradient, precomputed once per photo. */
function analyse(source: CropSource) {
  const { width, height, data } = source
  const pixels = width * height
  const luma = new Float32Array(pixels)
  const opaque = new Uint8Array(pixels)

  for (let index = 0; index < pixels; index++) {
    const offset = index * 4
    if (data[offset + 3] < ALPHA_THRESHOLD) continue
    opaque[index] = 1
    luma[index] =
      (0.299 * data[offset] +
        0.587 * data[offset + 1] +
        0.114 * data[offset + 2]) /
      255
  }

  // Central differences, so an edge is attributed to the pixel between its two
  // halves rather than to whichever side happened to be visited first.
  const gradient = new Float32Array(pixels)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x
      if (!opaque[index]) continue
      const dx = luma[index + 1] - luma[index - 1]
      const dy = luma[index + width] - luma[index - width]
      gradient[index] = Math.sqrt(dx * dx + dy * dy)
    }
  }

  return { luma, gradient, opaque }
}

/** The largest window of `aspect` that fits the source. */
function windowSize(source: CropSource, aspect: number) {
  const sampleAspect = source.width / source.height
  if (sampleAspect > aspect) {
    const height = source.height
    return { width: height * aspect, height }
  }
  const width = source.width
  return { width, height: width / aspect }
}

function scoreWindow(
  analysis: ReturnType<typeof analyse>,
  source: CropSource,
  window: CropWindow
) {
  const x0 = Math.max(0, Math.round(window.x))
  const y0 = Math.max(0, Math.round(window.y))
  const x1 = Math.min(source.width, Math.round(window.x + window.width))
  const y1 = Math.min(source.height, Math.round(window.y + window.height))
  if (x1 <= x0 || y1 <= y0) return { energy: 0, entropy: 0, coverage: 0 }

  const histogram = new Float64Array(HISTOGRAM_BUCKETS)
  let energy = 0
  let count = 0

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const index = y * source.width + x
      if (!analysis.opaque[index]) continue
      const value = Math.min(1, Math.max(0, analysis.luma[index]))
      const bucket = Math.min(
        HISTOGRAM_BUCKETS - 1,
        Math.floor(value * HISTOGRAM_BUCKETS)
      )
      histogram[bucket] += 1
      energy += analysis.gradient[index]
      count += 1
    }
  }

  if (count === 0) return { energy: 0, entropy: 0, coverage: 0 }

  // A window that is mostly a cutout's transparency must not score as if the
  // handful of opaque pixels were the whole crop.
  const coverage = count / ((x1 - x0) * (y1 - y0))

  let entropy = 0
  for (let bucket = 0; bucket < HISTOGRAM_BUCKETS; bucket++) {
    if (histogram[bucket] === 0) continue
    const p = histogram[bucket] / count
    entropy -= p * Math.log2(p)
  }

  return { energy: energy / count, entropy, coverage }
}

/**
 * Scores every valid crop and returns the best.
 *
 * The candidate count is bounded: the slack on the shorter axis is divided into
 * `steps - 1` moves, which is plenty to find a subject and keeps the pass fast
 * enough to run on a click.
 */
export function bestCrop(
  source: CropSource,
  targetAspect: number,
  steps = 17
): CropResult | null {
  if (
    !Number.isFinite(targetAspect) ||
    targetAspect <= 0 ||
    source.width < 8 ||
    source.height < 8 ||
    source.data.length < source.width * source.height * 4
  ) {
    return null
  }

  const analysis = analyse(source)
  const size = windowSize(source, targetAspect)
  const slackX = Math.max(0, source.width - size.width)
  const slackY = Math.max(0, source.height - size.height)
  const horizontal = slackX >= slackY
  const slack = horizontal ? slackX : slackY

  const count =
    slack < 1
      ? 1
      : Math.max(2, Math.min(Math.max(2, steps), Math.floor(slack) + 1))

  const positions = Array.from({ length: count }, (_, index) =>
    count === 1 ? slack / 2 : (index / (count - 1)) * slack
  )

  const candidates: CropCandidate[] = positions.map((position) => {
    const window: CropWindow = horizontal
      ? { x: position, y: (source.height - size.height) / 2, ...size }
      : { x: (source.width - size.width) / 2, y: position, ...size }

    const { energy, entropy, coverage } = scoreWindow(analysis, source, window)
    return { ...window, energy, entropy, coverage, centre: 0, score: 0 }
  })

  // Normalise each signal across the candidates so one does not dominate by
  // having a larger natural range.
  const energies = candidates.map((candidate) => candidate.energy)
  const entropies = candidates.map((candidate) => candidate.entropy)
  const minEnergy = Math.min(...energies)
  const maxEnergy = Math.max(...energies)
  const minEntropy = Math.min(...entropies)
  const maxEntropy = Math.max(...entropies)

  const normalise = (value: number, min: number, max: number) =>
    max - min < 1e-9 ? 0 : (value - min) / (max - min)

  const halfSlack = slack / 2
  candidates.forEach((candidate) => {
    const distance = horizontal
      ? Math.abs(candidate.x + candidate.width / 2 - source.width / 2)
      : Math.abs(candidate.y + candidate.height / 2 - source.height / 2)

    candidate.centre =
      halfSlack < 1e-9 ? 1 : Math.max(0, 1 - distance / halfSlack)
    candidate.score =
      candidate.coverage *
      (ENERGY_WEIGHT * normalise(candidate.energy, minEnergy, maxEnergy) +
        ENTROPY_WEIGHT * normalise(candidate.entropy, minEntropy, maxEntropy) +
        CENTRE_WEIGHT * candidate.centre)
  })

  const best = candidates.reduce((winner, candidate) =>
    candidate.score > winner.score ? candidate : winner
  )

  return { best, candidates }
}
