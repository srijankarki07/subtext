import { ContextMenuSlice, EditorStore } from "@/types/store.types"
import { FabricObject } from "fabric"
import { StateCreator } from "zustand"

export const createContextMenuSlice: StateCreator<
  EditorStore,
  [],
  [],
  ContextMenuSlice
> = (set, get) => ({
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    targetObject: null,
  },

  openContextMenu: (x, y, obj) => {
    const { canvas } = get()

    // Automatically select the object under the cursor if it isn't locked
    if (obj && canvas && !(obj as { locked?: boolean }).locked) {
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
    }

    set({
      contextMenu: {
        visible: true,
        x,
        y,
        targetObject: obj || get().activeObject,
      },
      activeObject: obj || get().activeObject,
    })
  },

  closeContextMenu: () => {
    set({ contextMenu: { visible: false, x: 0, y: 0, targetObject: null } })
  },

  duplicateActiveObject: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return

    activeObject.clone().then((cloned: FabricObject) => {
      // Offset the cloned object by 20px so it doesn't perfectly hide the original
      cloned.set({
        left: (activeObject.left || 0) + 20,
        top: (activeObject.top || 0) + 20,
      })

      canvas.add(cloned)
      canvas.setActiveObject(cloned)
      canvas.requestRenderAll()

      set({ activeObject: cloned })
      saveHistoryState()
    })

    closeContextMenu()
  },
})
