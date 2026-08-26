import { create } from "zustand"
import { Canvas, FabricObject } from "fabric"

interface EditorState {
  canvas: Canvas | null
  activeObject: FabricObject | null
  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  clearCanvas: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
  canvas: null,
  activeObject: null,
  setCanvas: (canvas) => set({ canvas }),
  setActiveObject: (activeObject) => set({ activeObject }),
  clearCanvas: () =>
    set((state) => {
      state.canvas?.clear()
      state.canvas?.dispose()
      return { canvas: null, activeObject: null }
    }),
}))
