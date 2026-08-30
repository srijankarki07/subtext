import { Canvas, FabricImage, FabricObject, IText, Shadow } from "fabric"
import { create } from "zustand"
import {
  getContrastRatio,
  getVisibilityScore,
  getComplianceBadge,
  hexToRgb,
  getLuminance,
} from "@/lib/colorUtils"

export type TextBlockType = "quote" | "author" | "handle"
export type MobileTab = "templates" | "layers" | "edit" | "export" | null

export const ASPECT_RATIOS = {
  "1:1 (Square)": { width: 1080, height: 1080 },
  "9:16 (Reels/Story)": { width: 1080, height: 1920 },
  "4:5 (Portrait)": { width: 1080, height: 1350 },
  "16:9 (YouTube)": { width: 1920, height: 1080 },
}

interface ContrastStats {
  ratio: number
  score: number
  badge: "AAA" | "AA" | "FAIL"
  bgColor: string // The sampled background color
}

interface EditorState {
  canvas: Canvas | null
  activeObject: FabricObject | null
  activeMobileTab: MobileTab

  // Color Intelligence
  imagePalette: string[]
  contrastStats: ContrastStats | null

  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  setActiveMobileTab: (tab: MobileTab) => void

  // Color Intelligence Actions
  setImagePalette: (colors: string[]) => void
  calculateContrast: () => void
  autoColorText: () => void

  setAspectRatio: (width: number, height: number) => void
  addText: (type: TextBlockType) => void
  addImage: () => void
  deleteActiveObject: () => void
  clearCanvas: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: null,
  activeObject: null,
  activeMobileTab: null,

  imagePalette: [],
  contrastStats: null,

  // BASIC STATE
  setCanvas: (canvas) => set({ canvas }),

  setActiveObject: (activeObject) => {
    set({ activeObject })

    // Recalculate contrast whenever selection changes
    get().calculateContrast()
  },

  setActiveMobileTab: (tab) => {
    set({ activeMobileTab: tab })
  },

  // PALETTE
  setImagePalette: (colors) => {
    set({ imagePalette: colors })
  },

  // CONTRAST ENGINE
  calculateContrast: () => {
    const { canvas, activeObject } = get()

    // Only calculate if a text object is selected
    if (!canvas || !activeObject || activeObject.type !== "i-text") {
      set({ contrastStats: null })
      return
    }

    // 1. Temporarily hide the text object so we can see the background behind it
    activeObject.set("visible", false)
    canvas.renderAll()

    try {
      const rect = activeObject.getBoundingRect()
      const ctx = canvas.getContext()

      const retinaScaling = canvas.getRetinaScaling()

      // Convert Fabric coordinates to actual canvas pixels
      const left = Math.max(0, Math.floor(rect.left * retinaScaling))

      const top = Math.max(0, Math.floor(rect.top * retinaScaling))

      const width = Math.max(
        1,
        Math.min(
          Math.ceil(rect.width * retinaScaling),
          canvas.getWidth() * retinaScaling - left
        )
      )

      const height = Math.max(
        1,
        Math.min(
          Math.ceil(rect.height * retinaScaling),
          canvas.getHeight() * retinaScaling - top
        )
      )

      // Sample pixels underneath text
      const imageData = ctx.getImageData(left, top, width, height)

      // 2. Unhide the text immediately so the user never sees a flicker
      activeObject.set("visible", true)
      canvas.renderAll()

      //3. Average the RGB values of the background color

      let r = 0
      let g = 0
      let b = 0
      let count = 0

      // Step by 16 (4 pixels at a time) for massive performance boost during dragging
      for (let i = 0; i < imageData.data.length; i += 16) {
        r += imageData.data[i]
        g += imageData.data[i + 1]
        b += imageData.data[i + 2]
        count++
      }

      if (count === 0) {
        set({ contrastStats: null })
        return
      }

      r = Math.round(r / count)
      g = Math.round(g / count)
      b = Math.round(b / count)

      const bgHex =
        "#" +
        [r, g, b]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()

      // Text properties
      const textFill = (activeObject.get("fill") as string) || "#FFFFFF"
      const fontSize = (activeObject.get("fontSize") as number) || 40

      const rawWeight = activeObject.get("fontWeight")
      const fontWeight =
        typeof rawWeight === "number"
          ? rawWeight
          : rawWeight === "bold"
            ? 700
            : 400

      // WCAG calculations
      const contrastRatio = getContrastRatio(textFill, bgHex)
      const score = getVisibilityScore(contrastRatio, fontSize, fontWeight)
      const badge = getComplianceBadge(contrastRatio, fontSize, fontWeight)

      //Update state with live metrics
      set({
        contrastStats: {
          ratio: contrastRatio,
          score,
          badge,
          bgColor: bgHex,
        },
      })
    } catch (error) {
      console.error("Failed to calculate contrast:", error)

      // Always restore the object if sampling fails
      activeObject.set("visible", true)
      canvas.renderAll()

      set({ contrastStats: null })
    }
  },

  // Smart feature: Flip text to White or Black depending on background brightness
  autoColorText: () => {
    const { canvas, activeObject, contrastStats } = get()

    if (
      !canvas ||
      !activeObject ||
      activeObject.type !== "i-text" ||
      !contrastStats
    ) {
      return
    }

    const bgRgb = hexToRgb(contrastStats.bgColor)
    const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b)

    // Standard WCAG breakpoint: if background is light, use black. If dark, use white.
    const optimalTextColor = bgLuminance > 0.179 ? "#000000" : "#FFFFFF"

    activeObject.set("fill", optimalTextColor)
    canvas.requestRenderAll()

    // Recalculate after changing text color
    get().calculateContrast()
  },

  // ASPECT RATIO
  setAspectRatio: (width: number, height: number) => {
    const { canvas } = get()
    if (!canvas) return

    // Resize Fabric backstore
    canvas.setDimensions({ width, height }, { backstoreOnly: true })

    // Scale CSS so it visually fits inside the screen container
    const container = canvas.getElement().parentElement?.parentElement
    if (container) {
      // Leave a 40px margin around the artboard
      const scale = Math.min(
        (container.clientWidth - 80) / width,
        (container.clientHeight - 80) / height
      )

      // CSS dimensions
      canvas.setDimensions(
        {
          width: width * scale,
          height: height * scale,
        },
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

          // Images added through this action
          // also go behind text
          canvas.insertAt(0, img)
          canvas.setActiveObject(img)
          canvas.requestRenderAll()
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
    if (!canvas || !activeObject) {
      return
    }

    canvas.remove(activeObject)
    canvas.discardActiveObject()
    canvas.requestRenderAll()

    set({
      activeObject: null,
      contrastStats: null,
    })
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
  // CLEAR CANVAS

  clearCanvas: () =>
    set((state) => {
      state.canvas?.clear()
      state.canvas?.dispose()

      return {
        canvas: null,
        activeObject: null,
        contrastStats: null,
        imagePalette: [],
      }
    }),
}))
