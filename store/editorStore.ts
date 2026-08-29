import { Canvas, FabricImage, FabricObject, IText, Shadow } from "fabric"
import { create } from "zustand"

export type TextBlockType = "quote" | "author" | "handle"
export type MobileTab = "templates" | "layers" | "edit" | "export" | null

export const ASPECT_RATIOS = {
  "1:1 (Square)": { width: 1080, height: 1080 },
  "9:16 (Reels/Story)": { width: 1080, height: 1920 },
  "4:5 (Portrait)": { width: 1080, height: 1350 },
  "16:9 (YouTube)": { width: 1920, height: 1080 },
}

interface EditorState {
  canvas: Canvas | null
  activeObject: FabricObject | null
  activeMobileTab: MobileTab
  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  setActiveMobileTab: (tab: MobileTab) => void
  setAspectRatio: (width: number, height: number) => void // Updated signature
  addText: (type: TextBlockType) => void
  addImage: () => void
  deleteActiveObject: () => void
  clearCanvas: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: null,
  activeObject: null,
  activeMobileTab: null,

  setCanvas: (canvas) => set({ canvas }),
  setActiveObject: (activeObject) => set({ activeObject }),
  setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),

  // Now takes exact dimensions directly
  setAspectRatio: (width: number, height: number) => {
    const { canvas } = get()
    if (!canvas) return

    // Resize internal Fabric canvas
    canvas.setDimensions({ width, height }, { backstoreOnly: true })

    // Scale CSS so it visually fits inside the screen container
    const container = canvas.getElement().parentElement?.parentElement
    if (container) {
      // Leave a 40px margin around the artboard
      const scale = Math.min(
        (container.clientWidth - 80) / width,
        (container.clientHeight - 80) / height
      )

      canvas.setDimensions(
        { width: width * scale, height: height * scale },
        { cssOnly: true }
      )
      canvas.setZoom(scale)

      // Add a distinct shadow and border to the Fabric wrapper so it looks like an Artboard
      const wrapper = canvas.getElement().parentElement
      if (wrapper) {
        wrapper.style.boxShadow = "0 20px 50px rgba(0,0,0,0.8)"
        wrapper.style.border = "1px solid rgba(255,255,255,0.1)"
        wrapper.style.backgroundColor = "#1C1C1E" // Artboard background color
      }
    }

    canvas.requestRenderAll()
  },

  addImage: () => {
    const { canvas } = get()
    if (!canvas) return

    // Create a hidden input programmatically
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (f) => {
        const data = f.target?.result as string
        try {
          const img = await FabricImage.fromURL(data)
          const scale = Math.min(
            canvas.getWidth() / (img.width || 1),
            canvas.getHeight() / (img.height || 1)
          )
          img.scale(scale * 0.9)
          canvas.centerObject(img)
          canvas.add(img)
          canvas.setActiveObject(img)
        } catch (error) {
          console.error("Failed to load image:", error)
        }
      }
      reader.readAsDataURL(file)
    }
    // Trigger the file browser
    input.click()
  },

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
