import type { Canvas } from "fabric"

/**
 * The artboard's default fill, used until an image covers it. This is artwork
 * background, not chrome — it is what a text-only composition exports against.
 */
export const DEFAULT_ARTBOARD_BACKGROUND = "#1C1C1E"

/**
 * Shared helpers for the Fabric document.
 *
 * Both the save payload and the history stack serialise the canvas, and the
 * two property lists were previously duplicated byte-for-byte in
 * `createCoreSlice` and `createHistorySlice`. Adding a custom attribute to one
 * and not the other is a silent data-loss bug, so they now share one list.
 */

/**
 * Custom attributes on Fabric objects that must survive a JSON round-trip.
 * Anything not listed here is dropped on save, undo, and reload.
 */
export const DOCUMENT_PROPERTIES = [
  "id",
  "isEffect",
  "textType",
  "vignetteColor",
  "vignetteType",
  "vignetteOpacity",
  "blurOpacity",
  "overlayId",
  "selectable",
  "evented",
  "lockMovementX",
  "lockMovementY",
  "lockScalingX",
  "lockScalingY",
  "stroke",
  "strokeWidth",
  "strokeDashArray",
] as const

/**
 * Re-binds the clip path of selective-blur overlays to their draggable handle.
 *
 * `loadFromJSON` replaces every object, which drops the listeners registered
 * when the handle was created — so this has to run after any load: undo, redo,
 * jump-to-history and restoring a saved project. It was duplicated verbatim in
 * both history and save code, which meant a fix in one place could miss the
 * other.
 */
export function bindBlurHandleListeners(canvas: Canvas): void {
  const objects = canvas.getObjects()

  objects.forEach((object: any) => {
    if (!object.id?.startsWith("blur-handle")) return

    const overlay = objects.find((candidate: any) => candidate.id === object.overlayId)
    if (!overlay) return

    const updateClip = () => {
      overlay.set({
        clipPath: new object.constructor({
          left: object.left,
          top: object.top,
          width: object.getScaledWidth(),
          height: object.getScaledHeight(),
          absolutePositioned: true,
        }),
      })
      canvas.requestRenderAll()
    }

    object.on("moving", updateClip)
    object.on("scaling", updateClip)
  })
}
