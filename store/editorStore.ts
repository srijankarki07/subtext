import { Canvas, FabricObject, IText, Shadow } from "fabric"
import { create } from "zustand"

export type TextBlockType = "quote" | "author" | "handle"

interface EditorState {
  canvas: Canvas | null
  activeObject: FabricObject | null
  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  addText: (type: TextBlockType) => void
  deleteActiveObject: () => void
  clearCanvas: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: null,
  activeObject: null,
  setCanvas: (canvas) => set({ canvas }),
  setActiveObject: (activeObject) => set({ activeObject }),

  deleteActiveObject: () => {
    const { canvas, activeObject } = get()
    if (canvas && activeObject) {
      canvas.remove(activeObject)
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      set({ activeObject: null })
    }
  },

  addText: (type: TextBlockType) => {
    const { canvas } = get()
    if (!canvas) return

    let textStr = ""
    const options: Record<string, string | number | Shadow> = {
      fill: "#ffffff",
      originX: "center",
      originY: "center",
      shadow: new Shadow({
        color: "rgba(0,0,0,0.5)",
        blur: 10,
        offsetX: 2,
        offsetY: 2,
      }),
    }

    switch (type) {
      case "quote":
        textStr = '"To create is to live twice."'
        Object.assign(options, {
          fontFamily: "Playfair Display",
          fontSize: 64,
          fontWeight: "bold",
          textAlign: "center",
        })
        break
      case "author":
        textStr = "— Albert Camus"
        Object.assign(options, {
          fontFamily: "Montserrat",
          fontSize: 24,
          fontStyle: "italic",
          opacity: 0.8,
        })
        break
      case "handle":
        textStr = "@cinemate"
        Object.assign(options, {
          fontFamily: "Inter",
          fontSize: 16,
          charSpacing: 200,
          opacity: 0.6,
        })
        break
    }

    const textObject = new IText(textStr, {
      ...options,
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
    })

    canvas.add(textObject)
    canvas.setActiveObject(textObject)
    canvas.requestRenderAll()
  },

  clearCanvas: () =>
    set((state) => {
      state.canvas?.clear()
      state.canvas?.dispose()

      return {
        canvas: null,
        activeObject: null,
      }
    }),
}))
