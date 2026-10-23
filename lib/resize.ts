/**
 * Reflowing a composition to a new frame size.
 *
 * Pure geometry, like `lib/arrange.ts`: the store adapter reads Fabric objects
 * and applies the results, while everything that can be wrong by a few pixels
 * lives here where Node can exercise it without a canvas.
 *
 * The model has two kinds of thing on it. A photo whose job is the background
 * covers the frame, so it is re-covered at the new aspect; everything else is
 * placed by where it sat in the frame, so it is remapped by ratio rather than
 * by pixels. Scales come from the area ratio because that is what keeps a
 * layout looking equally dense: 9:16 to 16:9 has the same area and leaves type
 * alone, while 9:16 to 1:1 shrinks it to 75%.
 */

export interface Frame {
  width: number
  height: number
}

export interface Point {
  left: number
  top: number
}

export interface Size {
  width: number
  height: number
}

/**
 * The scale that keeps a layout's visual density.
 *
 * The geometric mean of the two axis ratios is the square root of the area
 * ratio, which is the only scale under which "the same layout, smaller" holds
 * on both axes at once.
 */
export function resizeFactor(from: Frame, to: Frame): number {
  if (from.width <= 0 || from.height <= 0) return 1
  if (to.width <= 0 || to.height <= 0) return 1
  return Math.sqrt((to.width * to.height) / (from.width * from.height))
}

/** Where a point lands when the frame changes: by position, not by distance. */
export function remapPoint(point: Point, from: Frame, to: Frame): Point {
  if (from.width <= 0 || from.height <= 0) return { ...point }
  return {
    left: (point.left / from.width) * to.width,
    top: (point.top / from.height) * to.height,
  }
}

/**
 * Whether a box is a backdrop photo rather than a placed image.
 *
 * Tolerance rather than equality: cover-scaling rounds, and a photo that fills
 * the frame within a pixel or two is still the backdrop. A cutout that kept the
 * photo's scale counts too, which is what makes a portrait-and-object stack
 * survive a resize together.
 */
export function coversFrame(
  box: Size,
  frame: Frame,
  tolerance = 0.02
): boolean {
  if (frame.width <= 0 || frame.height <= 0) return false
  const slack = 1 - tolerance
  return box.width >= frame.width * slack && box.height >= frame.height * slack
}

/** The scale a photo needs to cover the frame without letterboxing. */
export function coverScale(size: Size, frame: Frame): number {
  return Math.max(
    frame.width / Math.max(size.width, 1),
    frame.height / Math.max(size.height, 1)
  )
}
