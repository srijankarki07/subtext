/**
 * Turning a background preset into a Fabric fill.
 *
 * The preset data lives in `lib/backgrounds.ts`; this is the adapter that needs
 * a DOM, because a pattern is a tile drawn to a canvas. Patterns are tiles
 * rather than images so there is no asset to fetch and nothing to lose when a
 * document is reopened - the tile is drawn from the preset's own colours.
 */

import { Gradient, Pattern, Rect, type Canvas, type FabricObject } from "fabric"

import {
  gradientCoords,
  type BackgroundPreset,
  type Frame,
  type PatternPreset,
} from "./backgrounds"

/** The one background layer; kept out of selection and hit-testing. */
export function isBackgroundObject(object: FabricObject): boolean {
  return (object as { isBackground?: boolean }).isBackground === true
}

/** The preset the open document is using, read from the layer itself. */
export function backgroundIdOf(canvas: Canvas): string | null {
  const object = canvas.getObjects().find(isBackgroundObject) as
    (FabricObject & { backgroundId?: string }) | undefined
  return object?.backgroundId ?? null
}

export function removeBackgroundObjects(canvas: Canvas) {
  canvas
    .getObjects()
    .filter(isBackgroundObject)
    .forEach((object) => {
      canvas.remove(object)
    })
}

/**
 * Draws one seamless tile.
 *
 * Seamlessness is the whole job: every shape either sits on the tile's edges or
 * is repeated at the matching offset, so a grid of tiles reads as one surface.
 */
function drawTile(preset: PatternPreset): HTMLCanvasElement {
  const size = Math.max(4, Math.round(preset.tile))
  const weight = Math.max(1, preset.weight)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext("2d")
  if (!context) return canvas

  context.fillStyle = preset.background
  context.fillRect(0, 0, size, size)

  context.fillStyle = preset.foreground
  context.strokeStyle = preset.foreground
  context.lineWidth = weight

  switch (preset.shape) {
    case "dots":
      context.beginPath()
      context.arc(size / 2, size / 2, weight, 0, Math.PI * 2)
      context.fill()
      break
    case "grid":
      // One line on each edge: the neighbouring tile supplies the other side.
      context.fillRect(0, 0, size, weight)
      context.fillRect(0, 0, weight, size)
      break
    case "stripes":
      for (const offset of [-size, 0, size]) {
        context.beginPath()
        context.moveTo(0, offset)
        context.lineTo(size, offset + size)
        context.stroke()
      }
      break
    case "crosshatch":
      for (const offset of [-size, 0, size]) {
        context.beginPath()
        context.moveTo(0, offset)
        context.lineTo(size, offset + size)
        context.stroke()
        context.beginPath()
        context.moveTo(0, offset)
        context.lineTo(size, offset - size)
        context.stroke()
      }
      break
  }

  return canvas
}

export function buildBackgroundFill(
  preset: BackgroundPreset,
  frame: Frame
): string | Gradient<"linear"> | Pattern {
  if (preset.kind === "solid") return preset.color

  if (preset.kind === "gradient") {
    return new Gradient({
      type: "linear",
      gradientUnits: "percentage",
      coords: gradientCoords(preset.angle, frame),
      colorStops: preset.stops,
    })
  }

  return new Pattern({ source: drawTile(preset), repeat: "repeat" })
}

/**
 * The full-frame layer itself.
 *
 * `selectable` and `evented` are off because this is the ground, not artwork:
 * clicking it should keep the photo selected, and it must not appear in a
 * marquee. Its id is what the panel reads back so the swatch stays truthful
 * after an undo or a reload.
 */
export function createBackgroundObject(
  preset: BackgroundPreset,
  frame: Frame
): Rect {
  const rect = new Rect({
    left: 0,
    top: 0,
    width: frame.width,
    height: frame.height,
    originX: "left",
    originY: "top",
    fill: buildBackgroundFill(preset, frame),
    strokeWidth: 0,
    selectable: false,
    evented: false,
  })

  const tagged = rect as Rect & { isBackground: boolean; backgroundId: string }
  tagged.isBackground = true
  tagged.backgroundId = preset.id
  return rect
}
