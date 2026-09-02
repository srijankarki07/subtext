import { EditorStore, HistorySlice } from "@/types/store.types"
import { StateCreator } from "zustand"

export const createHistorySlice: StateCreator<
  EditorStore,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  isHistoryProcessing: false,

  saveHistoryState: () => {
    const { canvas, isHistoryProcessing, history, historyIndex } = get()

    // Prevent recursive saving during an active undo/redo operation
    if (!canvas || isHistoryProcessing) return

    try {
      // Serialize the entire canvas to a JSON string
      const json = JSON.stringify(canvas.toJSON())

      // If we undo a few steps, then make a new edit, we must discard the "future" redo history
      const newHistory = history.slice(0, historyIndex + 1)

      // Prevent saving if the state hasn't actually changed (avoids duplicate states)
      if (newHistory[newHistory.length - 1] === json) return

      newHistory.push(json)

      // Cap history at 50 steps to prevent massive memory leaks
      if (newHistory.length > 50) newHistory.shift()

      const newIndex = newHistory.length - 1

      set({
        history: newHistory,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: false, // Creating a new state always clears the redo stack
      })
    } catch (e) {
      console.error("Failed to save state history:", e)
    }
  },

  undo: async () => {
    const { canvas, history, historyIndex, canUndo, isHistoryProcessing } =
      get()
    if (!canvas || !canUndo || isHistoryProcessing || historyIndex <= 0) return

    const nextIndex = historyIndex - 1

    // Lock the history system to prevent race conditions during async loading
    set({ isHistoryProcessing: true })

    try {
      await canvas.loadFromJSON(history[nextIndex])
      canvas.renderAll()

      set({
        historyIndex: nextIndex,
        canUndo: nextIndex > 0,
        canRedo: nextIndex < history.length - 1,
        isHistoryProcessing: false,
        activeObject: canvas.getActiveObject() || null,
      })
      get().calculateContrast()
    } catch (e) {
      set({ isHistoryProcessing: false })
    }
  },

  redo: async () => {
    const { canvas, history, historyIndex, canRedo, isHistoryProcessing } =
      get()
    if (
      !canvas ||
      !canRedo ||
      isHistoryProcessing ||
      historyIndex >= history.length - 1
    )
      return

    const nextIndex = historyIndex + 1
    set({ isHistoryProcessing: true })

    try {
      await canvas.loadFromJSON(history[nextIndex])
      canvas.renderAll()

      set({
        historyIndex: nextIndex,
        canUndo: nextIndex > 0,
        canRedo: nextIndex < history.length - 1,
        isHistoryProcessing: false,
        activeObject: canvas.getActiveObject() || null,
      })
      get().calculateContrast()
    } catch (e) {
      set({ isHistoryProcessing: false })
    }
  },
})
