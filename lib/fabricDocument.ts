import type { Canvas } from "fabric"

import { applyBlurClips } from "@/lib/blurZone"

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
  "overlayIds",
  "blurRing",
  "blurFeather",
  "assetId",
  "selectable",
  "evented",
  "lockMovementX",
  "lockMovementY",
  "lockScalingX",
  "lockScalingY",
  "stroke",
  "strokeWidth",
  "strokeDashArray",
  "editorOnly",
] as const

/**
 * Runs `render` with editor-only objects hidden, then restores them.
 *
 * Some objects exist only to be manipulated in the editor — the selective-blur
 * handle is a dashed rectangle you drag. It is a real Fabric object, so it was
 * being rendered into every export. `excludeFromExport` is no help: Fabric only
 * consults it when serialising, not when rendering for export, and the handle
 * *must* stay in the saved JSON because it is what the clip path is rebound
 * from on load.
 *
 * Visibility is restored to its previous value rather than forced visible, and
 * in a `finally`, so a failed render cannot leave the editor without its
 * handles.
 */
export function withoutEditorChrome<T>(canvas: Canvas, render: () => T): T {
  const hidden: Array<{ object: any; wasVisible: boolean }> = []

  canvas.getObjects().forEach((object: any) => {
    if (object.editorOnly !== true) return
    hidden.push({ object, wasVisible: object.visible })
    object.set("visible", false)
  })

  try {
    return render()
  } finally {
    hidden.forEach(({ object, wasVisible }) =>
      object.set("visible", wasVisible)
    )
  }
}

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
    object.on("moving", () => applyBlurClips(canvas))
    object.on("scaling", () => applyBlurClips(canvas))
  })

  applyBlurClips(canvas)
}

/**
 * A text object's weight, as a number.
 *
 * Fabric accepts either — the templates say `fontWeight: "bold"` and the
 * inspector's slider works in hundreds — so every reader has to normalise, and
 * two readers normalising differently is how a Bold button ends up looking
 * unpressed on text that is visibly bold. It was doing exactly that: the toolbar
 * compared the raw value to 700, got `NaN` from `"bold"`, and reported "not
 * bold" for bold text.
 */
export function readFontWeight(value: unknown): number {
  if (typeof value === "number") return value
  if (value === "bold") return 700
  if (value === "normal") return 400
  return parseInt(String(value), 10) || 400
}
