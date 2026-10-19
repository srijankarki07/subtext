import { loadSVGFromString, util, type FabricObject } from "fabric"
import { StateCreator } from "zustand"

import {
  elementById,
  elementIdFromObjectId,
  elementSvg,
  type ElementDef,
} from "@/lib/elements"
import { EditorStore, ElementSlice } from "@/types/store.types"

/**
 * Shapes, lines and icons inserted from the Elements panel.
 *
 * The SVG is parsed by Fabric rather than mapped node-by-node, so a circle, a
 * polyline and a path all become the objects Fabric already knows how to
 * select, scale and serialise. No custom document properties are involved: the
 * catalogue id is stamped onto Fabric's own `id`, which is already saved.
 */

/** An inserted element's size, as a share of the artboard's shorter side. */
const SIZE_RATIO = 0.18
const MIN_SIZE = 64
const VIEW_BOX = 24

/**
 * Normalises the paint after loading.
 *
 * The SVG says `stroke-width="2"` in a 24-unit box; scaled to ~190px that is a
 * 16px line. `strokeUniform` keeps the stroke at its stated width whatever the
 * object's scale, so an outline stays an outline.
 */
function normaliseStroke(object: FabricObject, def: ElementDef): void {
  if (def.paint === "stroke") {
    object.set({ strokeUniform: true, strokeWidth: 2 })
  }

  const getObjects = (object as { getObjects?: () => FabricObject[] })
    .getObjects
  if (typeof getObjects === "function") {
    getObjects.call(object).forEach((child) => normaliseStroke(child, def))
  }
}

export const createElementSlice: StateCreator<
  EditorStore,
  [],
  [],
  ElementSlice
> = (_set, get) => ({
  addElement: async (id, colour = "#FFFFFF") => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    const def = elementById(id)
    if (!def) return

    const { objects } = await loadSVGFromString(elementSvg(def, colour))
    const valid = objects.filter((object): object is FabricObject =>
      Boolean(object)
    )
    if (valid.length === 0) return

    const element = valid.length === 1 ? valid[0] : util.groupSVGElements(valid)
    const size = Math.max(
      MIN_SIZE,
      Math.round(Math.min(canvas.getWidth(), canvas.getHeight()) * SIZE_RATIO)
    )
    const scale = size / VIEW_BOX

    normaliseStroke(element, def)
    element.set({
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: "center",
      originY: "center",
      scaleX: scale,
      scaleY: scale,
    })
    // Both are in DOCUMENT_PROPERTIES, so the layer name and the colour control
    // survive a save and reload.
    const stamped = element as FabricObject & {
      id?: string
      elementName?: string
    }
    stamped.id = `element-${def.id}`
    stamped.elementName = def.name
    element.setCoords()

    canvas.add(element)
    canvas.setActiveObject(element)
    canvas.requestRenderAll()
    saveHistoryState("Add element")
  },

  setElementColor: (colour) => {
    const { canvas, activeObject, saveHistoryState } = get()
    if (!canvas || !activeObject) return

    const objectId = String((activeObject as { id?: string }).id ?? "")
    const def = elementById(elementIdFromObjectId(objectId) ?? "")
    if (!def) return

    const apply = (object: FabricObject) => {
      if (def.paint === "stroke") {
        if (object.stroke) object.set({ stroke: colour })
      } else if (object.fill && object.fill !== "transparent") {
        object.set({ fill: colour })
      }

      const getObjects = (object as { getObjects?: () => FabricObject[] })
        .getObjects
      if (typeof getObjects === "function") {
        getObjects.call(object).forEach(apply)
      }
    }
    apply(activeObject)

    canvas.requestRenderAll()
    // A drag through a colour picker is one undo step.
    saveHistoryState("Element colour", { coalesceKey: "element-colour" })
  },
})
