/**
 * Motion: how the composition enters, and how long it lasts.
 *
 * Text animation and a Ken Burns move on the photograph, the two things a
 * Reels export needs before video backgrounds are worth attempting. The timing
 * is pure - a time in, a frame state out - so the same maths drives the preview,
 * the export, and the tests, and the exported video cannot disagree with what
 * the preview showed.
 *
 * Not per-object keyframes: every text block enters with the chosen preset,
 * staggered by its position in the stack. That is the minimal timeline the
 * roadmap asks for, expressed as data rather than as a new document model.
 */

export type MotionPreset = "none" | "fade" | "rise" | "typewriter"
export type KenBurnsStrength = "off" | "subtle" | "strong"

export interface MotionSettings {
  preset: MotionPreset
  kenBurns: KenBurnsStrength
  /** Total length of the video, in seconds. */
  duration: number
}

export const MOTION_DURATIONS = [3, 5, 8] as const

export const MOTION_PRESETS: {
  id: MotionPreset
  label: string
  description: string
}[] = [
  { id: "none", label: "None", description: "The type is simply there." },
  { id: "fade", label: "Fade", description: "The words appear in place." },
  { id: "rise", label: "Rise", description: "The words rise as they appear." },
  {
    id: "typewriter",
    label: "Typewriter",
    description: "The words are typed out.",
  },
]

export const KEN_BURNS: {
  id: KenBurnsStrength
  label: string
  /** Total zoom at the end of the video, as a fraction. */
  amount: number
}[] = [
  { id: "off", label: "Off", amount: 0 },
  { id: "subtle", label: "Subtle", amount: 0.06 },
  { id: "strong", label: "Strong", amount: 0.14 },
]

export const DEFAULT_MOTION: MotionSettings = {
  preset: "fade",
  kenBurns: "subtle",
  duration: 3,
}

/** How far a rising block travels, in a 1080-tall frame. */
export const RISE_DISTANCE = 40

/** The vertical distance a block travels, scaled to the frame it is on. */
export function riseDistanceFor(frameHeight: number): number {
  return (RISE_DISTANCE * frameHeight) / 1080
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export interface BlockFrame {
  /** 0–1. */
  opacity: number
  /** Vertical offset from the block's rest position, in frame units. */
  offsetY: number
  /** Characters to show, or null when the whole string is visible. */
  characters: number | null
}

/**
 * The animation schedule for one text block.
 *
 * The intro window shares the video's duration rather than being a fixed 1.5s:
 * a three-second reel and an eight-second one are different edits, and the
 * shorter one cannot afford a long entrance. Blocks stagger so a quote and its
 * attribution do not arrive as one slab.
 */
export function scheduleFor(
  duration: number,
  preset: MotionPreset,
  index: number,
  blockCount: number
): { start: number; length: number } {
  if (preset === "none") return { start: 0, length: 0 }

  const total = Math.max(0.5, duration)
  const intro = Math.min(total * 0.6, 2.6)
  const stagger =
    blockCount > 1 ? Math.min(0.3, intro / (Math.max(1, blockCount) * 2)) : 0
  const start = index * stagger
  const length = Math.max(0.35, intro - stagger * (blockCount - 1))

  return { start, length }
}

export function blockFrame(
  time: number,
  settings: MotionSettings,
  index: number,
  blockCount: number,
  textLength: number,
  frameHeight = 1080
): BlockFrame {
  if (settings.preset === "none") {
    return { opacity: 1, offsetY: 0, characters: null }
  }

  const { start, length } = scheduleFor(
    settings.duration,
    settings.preset,
    index,
    blockCount
  )
  const t = clamp01((time - start) / Math.max(0.001, length))
  const eased = easeOutCubic(t)

  if (settings.preset === "typewriter") {
    const characters = t <= 0 ? 0 : Math.floor(eased * Math.max(0, textLength))
    return {
      opacity: 1,
      offsetY: 0,
      characters: Math.min(Math.max(0, characters), Math.max(0, textLength)),
    }
  }

  return {
    opacity: eased,
    offsetY:
      settings.preset === "rise"
        ? (1 - eased) * riseDistanceFor(frameHeight)
        : 0,
    characters: null,
  }
}

/** The photo's zoom at a given moment: 1 at the start, 1 + amount at the end. */
export function kenBurnsScale(time: number, settings: MotionSettings): number {
  const strength =
    KEN_BURNS.find((entry) => entry.id === settings.kenBurns)?.amount ?? 0
  if (strength === 0) return 1

  const progress = clamp01(time / Math.max(0.001, settings.duration))
  return 1 + strength * progress
}

/** Whether the settings would produce a still. */
export function isMotionNeutral(settings: MotionSettings): boolean {
  return settings.preset === "none" && settings.kenBurns === "off"
}

/** A sane, even-dimensioned video size. H.264 requires even numbers. */
export function videoSize(width: number, height: number) {
  return {
    width: Math.max(2, Math.floor(width / 2) * 2),
    height: Math.max(2, Math.floor(height / 2) * 2),
  }
}
