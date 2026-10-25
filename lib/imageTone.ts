/**
 * The bridge between the tone maths and a Fabric image.
 *
 * Reading and writing the filter, and sampling the photo for the histogram,
 * live here so the panel is only layout and the arithmetic stays in
 * `lib/tonal.ts`. Nothing in this module is imported outside the browser.
 */

import type { FabricImage } from "fabric"

import {
  histogramFromPixels,
  isNeutralTone,
  type Histogram,
  type ToneState,
} from "./tonal"
import { ToneCurveFilter } from "./toneFilter"

/** The tone currently applied to an image, or null when there is none. */
export function readTone(
  image: FabricImage | null | undefined
): ToneState | null {
  if (!image?.filters) return null
  const filter = image.filters.find((entry) => entry.type === "ToneCurve") as
    ToneCurveFilter | undefined
  if (!filter) return null

  return {
    black: filter.black,
    white: filter.white,
    gamma: filter.gamma,
    curve: filter.curve.map((point) => ({ ...point })),
  }
}

/**
 * Replaces the image's tone filter.
 *
 * Neutral is stored as *absence*: a filter that leaves every pixel alone still
 * costs a pass over the image and still serialises parameters into the
 * document, and `isNeutralState` would make Fabric skip it anyway - so the
 * object is cleaner if it is simply not there.
 */
export function applyToneToImage(image: FabricImage, tone: ToneState): void {
  image.filters = (image.filters ?? []).filter(
    (filter) => filter.type !== "ToneCurve"
  )

  if (!isNeutralTone(tone)) {
    image.filters.push(new ToneCurveFilter(tone))
  }

  image.applyFilters()
}

/**
 * A histogram of the pixels currently on screen.
 *
 * `getElement()` returns the *filtered* copy when filters are applied, so the
 * graph shows the photograph as it looks now, grades included - not the file as
 * it was imported.
 */
export function histogramForImage(
  image: FabricImage | null | undefined,
  size = 192
): Histogram | null {
  if (!image) return null
  const element = image.getElement() as
    HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | null
  if (!element) return null

  const sourceWidth =
    (element as HTMLImageElement).naturalWidth || element.width
  const sourceHeight =
    (element as HTMLImageElement).naturalHeight || element.height
  if (!sourceWidth || !sourceHeight) return null

  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = Math.max(1, Math.round((size * sourceHeight) / sourceWidth))

  try {
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return null
    context.drawImage(element, 0, 0, canvas.width, canvas.height)
    return histogramFromPixels(
      context.getImageData(0, 0, canvas.width, canvas.height).data
    )
  } catch (error) {
    // A tainted canvas cannot be read; a histogram is an aid, not a
    // requirement, so the panel simply goes without one.
    console.error("Could not read the photo for its histogram:", error)
    return null
  }
}
