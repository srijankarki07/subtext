/**
 * The timeline model shared by the landing page's scripted demos.
 *
 * One number in, one frame out. Each demo declares its beats with integer
 * weights and gets back normalised spans that land exactly on 1, so changing one
 * weight moves every later beat without anything else being edited - and every
 * demo is driven by the same fold, so they cannot drift apart in the way two
 * copies of this arithmetic would.
 *
 * All of it is pure: no React, no DOM, no clock. It is deliberately only this
 * much and no more. The three demos produce very different things from their
 * progress value - the hero a seventeen-field frame, the contrast demo a canvas
 * repaint plus a pixel readback, the grade demo two numbers - so a shared frame
 * *shape* would make the largest of them the lowest common denominator. The
 * shared seam is the number, not what is built from it.
 */

/** Where a beat sits on the global timeline, 0..1. */
export interface Span {
  from: number
  to: number
}

/**
 * A beat. `label` and `caption` are the demo's own words - this module never
 * invents copy, it only carries it.
 */
export interface Step<TId extends string> {
  id: TId
  /** Short name for the step rail. */
  label: string
  /** The sentence shown under the demo while this beat is playing. */
  caption: string
  /** Share of the timeline. Weights are relative; they need not sum to anything. */
  weight: number
}

/**
 * Folds weights into normalised spans.
 *
 * The last span lands exactly on 1 because the cursor is divided by the total
 * rather than accumulated as a fraction - accumulating `0.3 + 0.24 + …` in
 * floating point drifts off the end of the timeline.
 */
export function buildSpans<TId extends string>(
  steps: readonly Step<TId>[]
): Record<TId, Span> {
  const total = steps.reduce((sum, step) => sum + step.weight, 0)
  const spans = {} as Record<TId, Span>
  let cursor = 0
  for (const step of steps) {
    const from = cursor / total
    cursor += step.weight
    spans[step.id] = { from, to: cursor / total }
  }
  return spans
}

/**
 * 0..1 within a beat, clamped - 0 before it starts, 1 after it ends.
 *
 * This is the whole reason the model works: every value a demo derives is
 * `sub(progress, SPANS[beat])` fed through an ease, so a demo never has to know
 * where its beats sit, only what its own beat does.
 */
export function sub(progress: number, span: Span): number {
  if (progress <= span.from) return 0
  if (progress >= span.to) return 1
  return (progress - span.from) / (span.to - span.from)
}

/** The beat a position falls in. Past the end, the last beat holds. */
export function stepAt<TId extends string>(
  progress: number,
  steps: readonly Step<TId>[],
  spans: Record<TId, Span>
): TId {
  for (const step of steps) {
    if (progress < spans[step.id].to) return step.id
  }
  return steps[steps.length - 1].id
}

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2

export const easeOut = (t: number) => 1 - (1 - t) ** 3
