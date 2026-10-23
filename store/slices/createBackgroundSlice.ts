import { getBackgroundPreset } from "@/lib/backgrounds"
import {
  createBackgroundObject,
  removeBackgroundObjects,
} from "@/lib/backgroundFill"
import { BackgroundSlice, EditorStore } from "@/types/store.types"
import { StateCreator } from "zustand"

/**
 * The layer behind everything.
 *
 * One background at a time, replaced rather than stacked: two half-covering
 * fills would only make the upper one the real background and leave an
 * invisible layer in the list. Clearing is the same action with no preset, so
 * there is no second path that can forget to update the panel.
 */
export const createBackgroundSlice: StateCreator<
  EditorStore,
  [],
  [],
  BackgroundSlice
> = (set, get) => ({
  backgroundPreset: null,

  applyBackground: (presetId) => {
    const { canvas, beginHistoryTransaction, endHistoryTransaction } = get()
    if (!canvas) return

    const preset = getBackgroundPreset(presetId)
    const id = preset?.id ?? null
    if (get().backgroundPreset === id) return

    beginHistoryTransaction("Change background")
    try {
      removeBackgroundObjects(canvas)

      if (preset) {
        const background = createBackgroundObject(preset, {
          width: canvas.getWidth(),
          height: canvas.getHeight(),
        })
        canvas.add(background)
        canvas.sendObjectToBack(background)
      }

      set({ backgroundPreset: id })
      canvas.requestRenderAll()
      get().saveHistoryState()
    } finally {
      endHistoryTransaction()
    }
  },
})
