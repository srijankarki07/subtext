import { CINEMATIC_PRESETS } from "@/lib/filters"
import { TEMPLATES } from "@/lib/templates"
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

    // 1. Synchronize logical canvas coordinate dimensions
    canvas.setDimensions({ width, height })

    // 2. Scale visually with CSS to fit container
    const container = canvas.getElement().parentElement?.parentElement
    if (container) {
      const scale = Math.min(
        (container.clientWidth - 80) / width,
        (container.clientHeight - 80) / height
      )

      canvas.setDimensions(
        {
          width: `${Math.round(width * scale)}px`,
          height: `${Math.round(height * scale)}px`,
        },
        { cssOnly: true }
      )
    }

    // 3. Adapt existing letterboxes and vignettes to the new aspect ratio
    const objects = canvas.getObjects()
    objects.forEach((obj: any) => {
      if (obj.id?.startsWith("vignette")) {
        obj.set({ left: 0, top: 0, width, height })
        obj.setCoords()
      }
      if (obj.id?.endsWith("-top")) {
        obj.set({ left: 0, top: 0, width })
        obj.setCoords()
      }
      if (obj.id?.endsWith("-bottom")) {
        obj.set({ left: 0, top: height - obj.getScaledHeight(), width })
        obj.setCoords()
      }
    })

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

  // TEMPLATE INJECTION
  applyTemplate: (templateId) => {
    const store = get() as EditorStore // Access full combined store context
    const { canvas, saveHistoryState } = store
    if (!canvas) return

    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()

    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    // 1. EXTRACT EXISTING USER TEXT
    const objects = canvas.getObjects()
    const existingTexts = objects.filter((o) => o.type === "i-text") as IText[]

    let preservedQuote: string | null = null
    let preservedAuthor: string | null = null
    let preservedHandle: string | null = null

    existingTexts.forEach((tObj, idx) => {
      const text = tObj.text || ""
      const role = (tObj as any).textType

      if (role === "quote" || (!role && idx === 0)) {
        if (!preservedQuote) preservedQuote = text
      } else if (role === "author" || (!role && idx === 1)) {
        if (!preservedAuthor) preservedAuthor = text
      } else if (role === "handle" || (!role && idx === 2)) {
        if (!preservedHandle) preservedHandle = text
      }
    })

    existingTexts.forEach((t) => canvas.remove(t))
    canvas.discardActiveObject()

    // 2. RESET EFFECTS
    store.resetEffect("all")

    // 3. APPLY TEMPLATE EFFECTS
    const fx = template.effects
    if (fx.presetName && CINEMATIC_PRESETS[fx.presetName]) {
      store.applyPreset(CINEMATIC_PRESETS[fx.presetName])
    }
    if (fx.brightness !== undefined)
      store.applyImageFilter("Brightness", { brightness: fx.brightness })
    if (fx.contrast !== undefined)
      store.applyImageFilter("Contrast", { contrast: fx.contrast })
    if (fx.saturation !== undefined)
      store.applyImageFilter("Saturation", { saturation: fx.saturation })
    if (fx.warmth !== undefined) store.applyWarmth(fx.warmth)
    if (fx.grainIntensity !== undefined)
      store.setGrainIntensity(fx.grainIntensity)
    if (fx.gradientOpacity !== undefined)
      store.setGradientOverlay(
        fx.gradientOpacity,
        "linear",
        "transparent",
        "rgba(0,0,0,0.9)"
      )

    if (fx.letterbox !== undefined) {
      store.addLetterbox(fx.letterbox)
    }

    if (fx.vignette) {
      store.addVignette(fx.vignette)
    }

    if (fx.duotone) {
      store.applyDuotone(fx.duotone.lightHex, fx.duotone.darkHex)
    }

    // 4. INJECT TEMPLATE TEXTS WITH DYNAMIC BOUNDING BOX CLAMPING
    template.texts.forEach((tConfig) => {
      let content = tConfig.text

      if (tConfig.type === "quote" && preservedQuote) content = preservedQuote
      else if (tConfig.type === "author" && preservedAuthor)
        content = preservedAuthor
      else if (tConfig.type === "handle" && preservedHandle)
        content = preservedHandle

      if (!content) {
        content =
          tConfig.type === "quote"
            ? '"To create is to live twice."'
            : tConfig.type === "author"
              ? "— ALBERT CAMUS"
              : "@cinemate"
      }

      const shadowObj = tConfig.shadow
        ? new Shadow({
            color: tConfig.shadow.color,
            blur: tConfig.shadow.blur,
            offsetX: tConfig.shadow.offsetX,
            offsetY: tConfig.shadow.offsetY,
          })
        : undefined

      const {
        type: textRole,
        text: _t,
        shadow: _s,
        left: relLeft,
        top: relTop,
        originX,
        originY,
        fontSize,
        ...styleOptions
      } = tConfig

      const textObject = new IText(content, {
        ...styleOptions,
        fontSize,
        shadow: shadowObj,
        left: canvasWidth * relLeft,
        top: canvasHeight * relTop,
        originX: originX || "left",
        originY: originY || "top",
      })

      // Dynamic text clamping: Prevents overflowing the canvas on narrow aspect ratios
      const sideMargin = canvasWidth * 0.08
      let availableWidth = canvasWidth - sideMargin * 2

      if (originX === "left") {
        availableWidth = canvasWidth - canvasWidth * relLeft - sideMargin
      } else if (originX === "right") {
        availableWidth = canvasWidth * relLeft - sideMargin
      }

      if (textObject.width > availableWidth && availableWidth > 50) {
        const fitScale = availableWidth / textObject.width
        textObject.set(
          "fontSize",
          Math.max(14, Math.floor(fontSize * fitScale))
        )
      }

      ;(textObject as any).textType = textRole
      canvas.add(textObject)
    })

    canvas.requestRenderAll()
    saveHistoryState()
  },
})
