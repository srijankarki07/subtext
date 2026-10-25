/**
 * The bridge between the crop scoring and a Fabric image.
 *
 * Sampling and positioning need a DOM and a canvas, so they live here; the
 * decision itself is in `lib/smartCrop.ts` and stays pure.
 */

import type { Canvas, FabricImage } from "fabric"

import {
  bestCrop,
  type CropCandidate,
  type CropSource,
  type CropWindow,
} from "./smartCrop"

/**
 * A small copy of the photograph to score.
 *
 * 192px on the long edge is enough for "where is the detail" and keeps a click
 * under a few milliseconds. The *filtered* element is sampled, so a graded photo
 * is framed by what the viewer actually sees.
 */
export function sampleImage(
  image: FabricImage,
  longEdge = 192
): CropSource | null {
  const element = image.getElement() as
    HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | null
  if (!element) return null

  const naturalWidth =
    (element as HTMLImageElement).naturalWidth || element.width
  const naturalHeight =
    (element as HTMLImageElement).naturalHeight || element.height
  if (!naturalWidth || !naturalHeight) return null

  const scale = Math.min(1, longEdge / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(8, Math.round(naturalWidth * scale))
  const height = Math.max(8, Math.round(naturalHeight * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  try {
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return null
    context.drawImage(element, 0, 0, width, height)
    return {
      width,
      height,
      data: context.getImageData(0, 0, width, height).data,
    }
  } catch (error) {
    // A tainted canvas cannot be read; the caller falls back to Fill.
    console.error("Could not sample the photo for framing:", error)
    return null
  }
}

/**
 * Positions the image so the chosen window fills the artboard.
 *
 * The window is expressed in sampled pixels, so it is converted back to the
 * photo's own pixels and then to canvas units through the cover scale. Origin
 * is pinned to the top-left first: the maths is written in that frame, and an
 * image moved by hand could have any origin.
 */
export function applyCropWindow(
  image: FabricImage,
  canvas: Canvas,
  window: CropWindow,
  source: CropSource
): void {
  const natural = image.getOriginalSize()
  if (!natural.width || !natural.height) return

  const scale = Math.max(
    canvas.getWidth() / natural.width,
    canvas.getHeight() / natural.height
  )
  const sourceX = (window.x / source.width) * natural.width
  const sourceY = (window.y / source.height) * natural.height

  image.set({
    originX: "left",
    originY: "top",
    scaleX: scale,
    scaleY: scale,
    left: -sourceX * scale,
    top: -sourceY * scale,
  })
  image.setCoords()
}

/** Samples, scores and applies. Returns the chosen window, or null. */
export function smartCropImage(
  image: FabricImage,
  canvas: Canvas
): CropCandidate | null {
  const source = sampleImage(image)
  if (!source) return null

  const result = bestCrop(source, canvas.getWidth() / canvas.getHeight())
  if (!result) return null

  applyCropWindow(image, canvas, result.best, source)
  return result.best
}
