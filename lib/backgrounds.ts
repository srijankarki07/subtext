/**
 * Background fills: the ground a composition sits on.
 *
 * The app has had a gradient *overlay* since the first effects pass - a wash on
 * top of the photo. This is the other thing: a real layer behind everything,
 * which is what a removed-background cutout needs to sit on, and what a layout
 * needs when there is no photo at all.
 *
 * Presets are data. A solid is a colour, a gradient is an angle and stops, a
 * pattern is a shape and two colours; the Fabric adapter in
 * `lib/backgroundFill.ts` turns whichever kind into a fill. Keeping the data
 * here means the arithmetic - where a gradient's ends land - can be tested in
 * Node, and the panel can draw a swatch without a canvas.
 */

import type { Frame } from "./resize"

export type { Frame }

interface BasePreset {
  id: string
  name: string
}

export interface SolidPreset extends BasePreset {
  kind: "solid"
  color: string
}

export interface GradientStop {
  offset: number
  color: string
}

export interface GradientPreset extends BasePreset {
  kind: "gradient"
  /** CSS angle: 0 points up, 90 points right. */
  angle: number
  stops: GradientStop[]
}

export type PatternShape = "dots" | "grid" | "stripes" | "crosshatch"

export interface PatternPreset extends BasePreset {
  kind: "pattern"
  shape: PatternShape
  /** The mark's colour. */
  foreground: string
  /** The tile's own ground. */
  background: string
  /** Tile edge in artboard pixels. */
  tile: number
  /** Stroke or dot size in artboard pixels. */
  weight: number
}

export type BackgroundPreset = SolidPreset | GradientPreset | PatternPreset

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // --- colours ------------------------------------------------------------
  { kind: "solid", id: "ink", name: "Ink", color: "#0B0B0C" },
  { kind: "solid", id: "chalk", name: "Chalk", color: "#F4F1EA" },
  { kind: "solid", id: "clay", name: "Clay", color: "#A34A2E" },
  { kind: "solid", id: "olive", name: "Olive", color: "#3B4436" },

  // --- gradients ----------------------------------------------------------
  {
    kind: "gradient",
    id: "midnight",
    name: "Midnight",
    angle: 160,
    stops: [
      { offset: 0, color: "#2C4A6E" },
      { offset: 0.55, color: "#16233B" },
      { offset: 1, color: "#05070D" },
    ],
  },
  {
    kind: "gradient",
    id: "ember",
    name: "Ember",
    angle: 15,
    stops: [
      { offset: 0, color: "#E8894B" },
      { offset: 0.5, color: "#8C2F14" },
      { offset: 1, color: "#1A0603" },
    ],
  },
  {
    kind: "gradient",
    id: "dusk",
    name: "Dusk",
    angle: 135,
    stops: [
      { offset: 0, color: "#D99AA7" },
      { offset: 0.5, color: "#5E4277" },
      { offset: 1, color: "#241634" },
    ],
  },
  {
    kind: "gradient",
    id: "seaglass",
    name: "Sea Glass",
    angle: 200,
    stops: [
      { offset: 0, color: "#E4F2EA" },
      { offset: 0.5, color: "#8FBFAF" },
      { offset: 1, color: "#2E5B57" },
    ],
  },
  {
    kind: "gradient",
    id: "peach",
    name: "Peach",
    angle: 120,
    stops: [
      { offset: 0, color: "#FDE2C8" },
      { offset: 0.55, color: "#F3A18C" },
      { offset: 1, color: "#C75D63" },
    ],
  },
  {
    kind: "gradient",
    id: "noir",
    name: "Noir",
    angle: 180,
    stops: [
      { offset: 0, color: "#2A2E34" },
      { offset: 1, color: "#08090B" },
    ],
  },

  // --- patterns -----------------------------------------------------------
  {
    kind: "pattern",
    id: "halftone",
    name: "Halftone",
    shape: "dots",
    foreground: "#F4F1EA",
    background: "#141518",
    tile: 20,
    weight: 3,
  },
  {
    kind: "pattern",
    id: "graph",
    name: "Graph",
    shape: "grid",
    foreground: "#C9C6BE",
    background: "#F4F1EA",
    tile: 32,
    weight: 1,
  },
  {
    kind: "pattern",
    id: "rules",
    name: "Rules",
    shape: "stripes",
    foreground: "#E0A443",
    background: "#141518",
    tile: 28,
    weight: 2,
  },
  {
    kind: "pattern",
    id: "crosshatch",
    name: "Crosshatch",
    shape: "crosshatch",
    foreground: "#6E6A63",
    background: "#F4F1EA",
    tile: 24,
    weight: 1,
  },
]

const BY_ID = new Map(BACKGROUND_PRESETS.map((preset) => [preset.id, preset]))

export function getBackgroundPreset(
  id: string | null | undefined
): BackgroundPreset | undefined {
  return id ? BY_ID.get(id) : undefined
}

/**
 * The gradient's ends as proportions of the frame.
 *
 * Percentage units, not pixels: the fill then stretches with the object when
 * the artboard is resized, instead of keeping the old frame's coordinates and
 * pointing the gradient off one edge. The line runs through the centre and is
 * long enough that both ends sit outside the box, which is what makes the first
 * and last stop reach the corners at any angle.
 */
export function gradientCoords(
  angle: number,
  frame: Frame
): { x1: number; y1: number; x2: number; y2: number } {
  const radians = (angle * Math.PI) / 180
  const dx = Math.sin(radians)
  const dy = -Math.cos(radians)

  // Half the box's projection onto the gradient's axis: for a unit direction,
  // the box's extent along it is |dx| * width + |dy| * height.
  const reach = (Math.abs(dx) * frame.width + Math.abs(dy) * frame.height) / 2
  const halfX = frame.width > 0 ? reach / frame.width : 0
  const halfY = frame.height > 0 ? reach / frame.height : 0

  return {
    x1: 0.5 - dx * halfX,
    y1: 0.5 - dy * halfY,
    x2: 0.5 + dx * halfX,
    y2: 0.5 + dy * halfY,
  }
}

/**
 * A CSS stand-in for the swatch buttons.
 *
 * The panel draws twelve previews before any canvas exists, so they cannot be
 * rendered by Fabric. They only have to read as the same family of fill.
 */
export function previewStyle(preset: BackgroundPreset): Record<string, string> {
  if (preset.kind === "solid") return { background: preset.color }

  if (preset.kind === "gradient") {
    const stops = preset.stops
      .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
      .join(", ")
    return { background: `linear-gradient(${preset.angle}deg, ${stops})` }
  }

  const mark = preset.foreground
  const ground = preset.background
  const size = `${Math.max(6, Math.round(preset.tile / 2))}px ${Math.max(6, Math.round(preset.tile / 2))}px`

  switch (preset.shape) {
    case "dots":
      return {
        backgroundColor: ground,
        backgroundImage: `radial-gradient(circle, ${mark} 1.5px, transparent 1.6px)`,
        backgroundSize: size,
      }
    case "grid":
      return {
        backgroundColor: ground,
        backgroundImage: `linear-gradient(${mark} 1px, transparent 1px), linear-gradient(90deg, ${mark} 1px, transparent 1px)`,
        backgroundSize: size,
      }
    case "stripes":
      return {
        backgroundColor: ground,
        backgroundImage: `repeating-linear-gradient(45deg, ${mark} 0 2px, transparent 2px 7px)`,
      }
    case "crosshatch":
      return {
        backgroundColor: ground,
        backgroundImage: `repeating-linear-gradient(45deg, ${mark} 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, ${mark} 0 1px, transparent 1px 6px)`,
      }
  }
}
