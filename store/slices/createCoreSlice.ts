import { CoreSlice, EditorStore } from "@/types/store.types"
import { FabricImage, IText, Shadow } from "fabric"
import { StateCreator } from "zustand"

export const createCoreSlice: StateCreator<EditorStore, [], [], CoreSlice> = (
  set,
  get
) => ({
  canvas: null,
  activeObject: null,
  activeMobileTab: null,
  artboard: { width: 1080, height: 1080 },

  setCanvas: (canvas) => set({ canvas }),

  setActiveObject: (activeObject) => {
    set({ activeObject })
    // Recalculate text-to-background contrast whenever a new object is selected
    get().calculateContrast()
  },

  setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),

  setAspectRatio: (width, height) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    set({ artboard: { width, height } })

    // Set internal resolution (high quality for export)
    canvas.setDimensions({ width, height }, { backstoreOnly: true })

    const container = canvas.getElement().parentElement?.parentElement
    if (container) {
      // Calculate a responsive scale to fit the canvas visually within the browser window
      const scale = Math.min(
        (container.clientWidth - 80) / width,
        (container.clientHeight - 80) / height
      )

      // CSS scaling visually downsizes the canvas without losing backstore resolution
      canvas.setDimensions(
        { width: width * scale, height: height * scale },
        { cssOnly: true }
      )

      // Reset zoom to 1 to ensure mouse coordinates accurately map to the canvas elements
      canvas.setZoom(1)

      // Add a distinct UI treatment so the canvas looks like an editable "Artboard"
      const wrapper = canvas.getElement().parentElement
      if (wrapper) {
        wrapper.style.boxShadow = "0 20px 50px rgba(0,0,0,0.8)"
        wrapper.style.border = "1px solid rgba(255,255,255,0.1)"
        wrapper.style.backgroundColor = "#1C1C1E"
      }
    }

    canvas.requestRenderAll()
    saveHistoryState()
  },

  addImage: () => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    // Create a hidden input programmatically to trigger the OS file browser
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
          img.set("crossOrigin", "anonymous")

          // Scale the image down automatically if it's larger than the canvas
          const scale = Math.min(
            canvas.getWidth() / (img.width || 1),
            canvas.getHeight() / (img.height || 1)
          )
          img.scale(scale * 0.9) // 90% of canvas size to leave a small margin
          canvas.centerObject(img)

          // Insert images at the back (index 0) so they act as backgrounds behind text
          canvas.insertAt(0, img)
          canvas.setActiveObject(img)
          canvas.requestRenderAll()
          saveHistoryState()
        } catch (error) {
          console.error("Failed to load image:", error)
        }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  },

  deleteActiveObject: (targetObj) => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    const target = targetObj || activeObject

    // Prevent deletion if the object is explicitly locked
    if (!canvas || !target || target.lockMovementX) return

    canvas.remove(target)
    canvas.discardActiveObject()
    canvas.requestRenderAll()

    set({ activeObject: null, contrastStats: null })
    closeContextMenu()
    saveHistoryState()
  },

  addText: (type) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    let textStr = ""

    // Shared default properties for all new text blocks
    const options: Record<string, string | number | Shadow> = {
      fill: "#ffffff",
      originX: "center", // Ensures scaling/rotation happens from the center of the text
      originY: "center",
      shadow: new Shadow({
        color: "rgba(0,0,0,0.5)",
        blur: 10,
        offsetX: 2,
        offsetY: 2,
      }),
    }

    // Apply specific typography styles based on the type of text being added
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
      left: canvas.getWidth() / 2, // Place directly in the center of the artboard
      top: canvas.getHeight() / 2,
    })

    canvas.add(textObject)
    canvas.setActiveObject(textObject)
    canvas.requestRenderAll()
    saveHistoryState()
  },

  clearCanvas: () =>
    set((state) => {
      state.canvas?.clear()
      state.canvas?.dispose()
      return {
        canvas: null,
        activeObject: null,
        contrastStats: null,
        imagePalette: [],
        history: [],
        historyIndex: -1,
        canUndo: false,
        canRedo: false,
      }
    }),
})
