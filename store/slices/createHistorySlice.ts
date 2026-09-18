import { EditorStore, HistoryItem, HistorySlice } from "@/types/store.types"
import { StateCreator } from "zustand"

const MAX_HISTORY_STEPS = 30

const HISTORY_PROPERTIES = [
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
]

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

  saveHistoryState: (description) => {
    const { canvas, isHistoryProcessing, history, historyIndex } = get()
    if (!canvas || isHistoryProcessing) return

    try {
      const json = JSON.stringify(canvas.toObject(HISTORY_PROPERTIES as any))
      const newHistory = history.slice(0, historyIndex + 1)

      // Avoid duplicate consecutive saves
      if (newHistory[newHistory.length - 1]?.json === json) return

      const objects = canvas.getObjects()
      const prevCount = newHistory[newHistory.length - 1]?.objectCount ?? 0
      const currentCount = objects.length

      // Auto-generate title if not explicitly provided
      let title = description
      if (!title) {
        if (newHistory.length === 0) {
          title = "Initial Canvas"
        } else if (currentCount > prevCount) {
          const lastObj = objects[objects.length - 1]
          title =
            lastObj.type === "i-text"
              ? "Add Text Layer"
              : lastObj.type === "image"
                ? "Add Image"
                : "Add Element"
        } else if (currentCount < prevCount) {
          title = "Delete Element"
        } else {
          const active = canvas.getActiveObject()
          title =
            active?.type === "i-text" ? "Edit Typography" : "Modify Canvas"
        }
      }

      const historyEntry: HistoryItem = {
        id:
          "hist-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
        json,
        title,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        objectCount: currentCount,
      }

      newHistory.push(historyEntry)

      if (newHistory.length > MAX_HISTORY_STEPS) {
        newHistory.shift()
      }

      const newIndex = newHistory.length - 1

      set({
        history: newHistory,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: false,
      })
    } catch (e) {
      console.error("Failed to save state history:", e)
    }
  },

  jumpToHistoryIndex: async (targetIndex: number) => {
    const { canvas, history, historyIndex, isHistoryProcessing } = get()
    if (
      !canvas ||
      isHistoryProcessing ||
      targetIndex < 0 ||
      targetIndex >= history.length ||
      targetIndex === historyIndex
    ) {
      return
    }

    set({ isHistoryProcessing: true })

    try {
      const targetState = history[targetIndex]
      await canvas.loadFromJSON(JSON.parse(targetState.json))

      // Re-bind draggable blur handles if any exist in the restored state
      canvas.getObjects().forEach((obj: any) => {
        if (obj.id?.startsWith("blur-handle")) {
          const overlay = canvas
            .getObjects()
            .find((o: any) => o.id === obj.overlayId)
          if (overlay) {
            const updateClip = () => {
              overlay.set({
                clipPath: new obj.constructor({
                  left: obj.left,
                  top: obj.top,
                  width: obj.getScaledWidth(),
                  height: obj.getScaledHeight(),
                  absolutePositioned: true,
                }),
              })
              canvas.requestRenderAll()
            }
            obj.on("moving", updateClip)
            obj.on("scaling", updateClip)
          }
        }
      })

      canvas.requestRenderAll()

      set({
        historyIndex: targetIndex,
        canUndo: targetIndex > 0,
        canRedo: targetIndex < history.length - 1,
        isHistoryProcessing: false,
        activeObject: canvas.getActiveObject() || null,
      })

      get().calculateContrast()
    } catch (e) {
      console.error("Jump to history error:", e)
      set({ isHistoryProcessing: false })
    }
  },

  undo: async () => {
    const { historyIndex } = get()
    if (historyIndex > 0) {
      await get().jumpToHistoryIndex(historyIndex - 1)
    }
  },

  redo: async () => {
    const { historyIndex, history } = get()
    if (historyIndex < history.length - 1) {
      await get().jumpToHistoryIndex(historyIndex + 1)
    }
  },
})
