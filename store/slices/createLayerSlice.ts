import { ActiveSelection, type Canvas, type FabricObject } from "fabric"
import { StateCreator } from "zustand"

import {
  alignBoxes,
  distributeBoxes,
  type AlignMode,
  type ArrangeBox,
  type DistributeAxis,
  type Move,
} from "@/lib/arrange"
import { EditorStore, LayerSlice } from "@/types/store.types"

/**
 * Layers that an alignment may move.
 *
 * Effect layers - blur overlays, vignette and gradient bands - are positioned
 * relative to the photo and are rebuilt from it, so moving one on its own would
 * break the effect it belongs to. Editor-only objects are handles, not
 * artwork. Locked layers are excluded for the same reason they cannot be
 * dragged.
 */
function isArrangeable(object: FabricObject): boolean {
  const flags = object as FabricObject & {
    locked?: boolean
    isEffect?: boolean
    editorOnly?: boolean
  }
  return !flags.locked && !flags.isEffect && !flags.editorOnly
}

/**
 * Runs a solver over the selected layers in absolute coordinates.
 *
 * An `ActiveSelection` keeps its children in the group's own coordinate space,
 * so a delta measured in scene pixels is not safe to add to `left`/`top` while
 * one is active. Dropping the selection first restores each child to absolute
 * coordinates; it is rebuilt afterwards so the user keeps hold of what they had
 * selected.
 */
function arrangeSelection(
  canvas: Canvas,
  targets: FabricObject[],
  solve: (boxes: ArrangeBox[]) => Move[]
): void {
  const active = canvas.getActiveObject()
  const wasMultiple = active?.type === "activeselection"
  if (wasMultiple) canvas.discardActiveObject()

  const boxes = targets.map((object) => {
    const rect = object.getBoundingRect()
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }
  })

  const moves = solve(boxes)
  targets.forEach((object, index) => {
    object.set({
      left: (object.left ?? 0) + moves[index].dx,
      top: (object.top ?? 0) + moves[index].dy,
    })
    object.setCoords()
  })

  if (wasMultiple) {
    canvas.setActiveObject(new ActiveSelection(targets, { canvas } as never))
  }
  canvas.requestRenderAll()
}

export const createLayerSlice: StateCreator<EditorStore, [], [], LayerSlice> = (
  set,
  get
) => ({
  bringToFront: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return
    canvas.bringObjectToFront(activeObject)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  bringForward: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return
    canvas.bringObjectForward(activeObject)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  sendBackward: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return
    canvas.sendObjectBackwards(activeObject)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  sendToBack: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return
    canvas.sendObjectToBack(activeObject)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  moveLayerToIndex: (oldIndex, newIndex) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    const objects = canvas.getObjects()
    if (
      oldIndex < 0 ||
      oldIndex >= objects.length ||
      newIndex < 0 ||
      newIndex >= objects.length
    )
      return

    const obj = objects[oldIndex]

    // Support for both newer Fabric versions (.moveTo) and older versions (direct array manipulation)
    if (typeof (obj as any).moveTo === "function") {
      ;(obj as any).moveTo(newIndex)
    } else {
      const _objects = (canvas as any)._objects
      if (_objects) {
        _objects.splice(oldIndex, 1) // Remove from old position
        _objects.splice(newIndex, 0, obj) // Insert at new position
      }
    }

    canvas.requestRenderAll()
    saveHistoryState()
  },

  toggleLayerLock: (obj) => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    const target = obj || activeObject
    if (!canvas || !target) return

    // Read and write the app's own flag; Fabric's locks are how it is enforced.
    const isLocked = !(target as { locked?: boolean }).locked

    // Exhaustively disable all interactions to ensure the layer acts strictly as a static background
    target.set({
      locked: isLocked,
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked,
      lockRotation: isLocked,
      hasControls: !isLocked, // Hide the transform borders
      selectable: !isLocked, // Prevent mouse selection
      evented: !isLocked, // Prevent all mouse events
    })

    // Specifically disable typing for text layers
    if (target.type === "i-text" || target.type === "text") {
      target.set("editable" as any, !isLocked)
    }

    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  toggleLayerVisibility: (obj) => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    const target = obj || activeObject
    if (!canvas || !target) return

    target.set("visible", !target.visible)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  alignObjectToCanvas: (alignment) => {
    const { canvas, activeObject, saveHistoryState } = get()
    if (
      !canvas ||
      !activeObject ||
      (activeObject as { locked?: boolean }).locked
    )
      return

    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()
    const objWidth = activeObject.getScaledWidth()
    const objHeight = activeObject.getScaledHeight()

    // We must account for the object's origin point (center vs top/left) to align accurately
    const originX = activeObject.originX || "left"
    const originY = activeObject.originY || "top"

    let newLeft = activeObject.left || 0
    let newTop = activeObject.top || 0

    // Switch case adjusts the left/top coordinates depending on whether the object's origin is centered or cornered
    switch (alignment) {
      case "left":
        newLeft =
          originX === "center"
            ? objWidth / 2
            : originX === "right"
              ? objWidth
              : 0
        activeObject.set("left", newLeft)
        break
      case "center-h":
        newLeft =
          originX === "center"
            ? canvasWidth / 2
            : originX === "right"
              ? canvasWidth / 2 + objWidth / 2
              : canvasWidth / 2 - objWidth / 2
        activeObject.set("left", newLeft)
        break
      case "right":
        newLeft =
          originX === "center"
            ? canvasWidth - objWidth / 2
            : originX === "right"
              ? canvasWidth
              : canvasWidth - objWidth
        activeObject.set("left", newLeft)
        break
      case "top":
        newTop =
          originY === "center"
            ? objHeight / 2
            : originY === "bottom"
              ? objHeight
              : 0
        activeObject.set("top", newTop)
        break
      case "center-v":
        newTop =
          originY === "center"
            ? canvasHeight / 2
            : originY === "bottom"
              ? canvasHeight / 2 + objHeight / 2
              : canvasHeight / 2 - objHeight / 2
        activeObject.set("top", newTop)
        break
      case "bottom":
        newTop =
          originY === "center"
            ? canvasHeight - objHeight / 2
            : originY === "bottom"
              ? canvasHeight
              : canvasHeight - objHeight
        activeObject.set("top", newTop)
        break
    }

    activeObject.setCoords() // Update bounding box for future mouse interactions
    canvas.requestRenderAll()
    saveHistoryState()
  },

  alignSelection: (alignment: AlignMode) => {
    const { canvas, selectedObjects, saveHistoryState, setSelection } = get()
    if (!canvas) return

    const targets = selectedObjects.filter(isArrangeable)
    if (targets.length < 2) return

    arrangeSelection(canvas, targets, (boxes) => alignBoxes(boxes, alignment))
    setSelection(targets)
    saveHistoryState("Align to selection")
  },

  distributeSelection: (axis: DistributeAxis) => {
    const { canvas, selectedObjects, saveHistoryState, setSelection } = get()
    if (!canvas) return

    const targets = selectedObjects.filter(isArrangeable)
    if (targets.length < 3) return

    arrangeSelection(canvas, targets, (boxes) => distributeBoxes(boxes, axis))
    setSelection(targets)
    saveHistoryState(
      axis === "horizontal"
        ? "Distribute horizontally"
        : "Distribute vertically"
    )
  },

  nudgeSelection: (dx, dy) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    // The canvas's active object, not the store's `activeObject`: for a group
    // the former is the ActiveSelection, and moving it moves every member,
    // while the latter is only the first member.
    const active = canvas.getActiveObject()
    if (!active) return

    // A locked layer does not move. Refuse rather than move a group that
    // happens to contain one and silently drag the locked layer with it.
    const locked = canvas
      .getActiveObjects()
      .some((object) => (object as { locked?: boolean }).locked)
    if (locked) return

    active.set({
      left: (active.left ?? 0) + dx,
      top: (active.top ?? 0) + dy,
    })
    active.setCoords()
    canvas.requestRenderAll()

    // One history entry per run of presses, not per press: a held arrow key
    // fires many events a second, and each becoming its own undo step would
    // make undo useless.
    saveHistoryState("Nudge", { coalesceKey: "nudge" })
  },

  fitImageToCanvas: (mode) => {
    const { canvas, activeObject, saveHistoryState } = get()
    if (
      !canvas ||
      !activeObject ||
      activeObject.type !== "image" ||
      (activeObject as { locked?: boolean }).locked
    )
      return

    // Calculate how much to scale width/height to match canvas dimensions
    const scaleX = canvas.getWidth() / (activeObject.width || 1)
    const scaleY = canvas.getHeight() / (activeObject.height || 1)

    // "fit" uses the smallest scale to show whole image, "fill" uses max to cover canvas without borders
    const scale =
      mode === "fit" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)

    activeObject.set({ scaleX: scale, scaleY: scale })
    canvas.centerObject(activeObject)
    activeObject.setCoords()
    canvas.requestRenderAll()
    saveHistoryState()
  },
})
