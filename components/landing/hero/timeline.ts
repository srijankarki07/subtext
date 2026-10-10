import {
  buildSpans,
  clamp01,
  easeInOut,
  easeOut,
  stepAt,
  sub,
  type Step,
} from "@/components/landing/playback/timeline"

/**
 * The hero demo's timeline.
 *
 * One number in, one frame out. The fold, the span arithmetic and the easings
 * come from `playback/timeline.ts`, which all three scripted demos on this page
 * share; what lives here is only what is true of the hero - its four beats and
 * everything the artboard derives from them.
 *
 * Keep the demos' *output* shapes separate. The hero's frame is a seventeen-field
 * object, which is right for an artboard and would be a straightjacket for the
 * other two.
 */

export type StepId = "quote" | "grade" | "guides" | "compare"

export const STEPS: readonly Step<StepId>[] = [
  {
    id: "quote",
    label: "Type",
    caption: "The quote goes on, set in a display serif over the dark sky.",
    weight: 30,
  },
  {
    id: "grade",
    label: "Colour",
    caption:
      "A duotone maps the picture's luminance between two colours, and film grain comes up under it.",
    weight: 24,
  },
  {
    id: "guides",
    label: "Guides",
    caption:
      "Thirds, centre lines and the 5% safe area switch on, one at a time.",
    weight: 18,
  },
  {
    id: "compare",
    label: "Compare",
    caption:
      "The divider opens on the original photograph, so the grade is a thing you can check.",
    weight: 28,
  },
]

export const SPANS = buildSpans(STEPS)

/** A real quote, short enough to type inside the step. */
export const QUOTE = "Some views are earned in the dark."
export const ATTRIBUTION = "Night ascent"

/**
 * How far each control is pushed at the end of the run.
 *
 * Milder than the editor's ceilings on purpose: this is a hero, and a demonstrable
 * grade reads better than an extreme one. Both are real values the panels accept.
 */
const DUOTONE_MAX = 74
const GRAIN_MAX = 26
/** The divider opens from the left edge to the middle, never further. */
export const COMPARE_MAX = 50

export interface Frame {
  activeStep: StepId
  /** 0..1 within the active step, for anything that wants finer control. */
  stepProgress: number
  /** The quote as far as it has been typed. */
  quote: string
  /** How much of the quote is set, 0..1 - drives the caret and the fade. */
  quoteProgress: number
  attribution: number
  /** Duotone intensity, 0..100. */
  duotone: number
  /** Film grain intensity, 0..100. */
  grain: number
  /** Guide opacities, 0..1. A guide is "checked" once its opacity is above 0. */
  thirds: number
  centre: number
  safeArea: number
  /** Compare divider position, 0..100. 0 is closed, 50 is an even split. */
  compare: number
}

/** The whole frame, derived from one number. */
export function frameAt(progress: number): Frame {
  const p = clamp01(progress)

  // Typing takes most of the step; the attribution line follows it in.
  const quoteT = sub(p, SPANS.quote)
  const typing = clamp01(quoteT / 0.78)
  const quoteProgress = typing
  const quote = QUOTE.slice(0, Math.round(typing * QUOTE.length))
  const attribution = clamp01((quoteT - 0.82) / 0.18)

  const gradeT = sub(p, SPANS.grade)
  const duotone = easeInOut(gradeT) * DUOTONE_MAX
  const grain = easeOut(gradeT) * GRAIN_MAX

  // Each guide fades in on its own beat, so the three rows in the panel tick on
  // one after another rather than all at once.
  const guideT = sub(p, SPANS.guides)
  const thirds = clamp01((guideT - 0.04) / 0.22)
  const centre = clamp01((guideT - 0.36) / 0.22)
  const safeArea = clamp01((guideT - 0.68) / 0.22)

  const compare = easeInOut(sub(p, SPANS.compare)) * COMPARE_MAX
  const activeStep = stepAt(p, STEPS, SPANS)

  return {
    activeStep,
    stepProgress: sub(p, SPANS[activeStep]),
    quote,
    quoteProgress,
    attribution,
    duotone,
    grain,
    thirds,
    centre,
    safeArea,
    compare,
  }
}

/**
 * The finished composition.
 *
 * This is the single frame shown under `prefers-reduced-motion`: the most
 * informative one, not frame zero. A reader who has asked for no motion is owed
 * the result, not the setup.
 */
export const FINAL: Frame = frameAt(1)
