import {
  getComplianceBadge,
  getContrastRatio,
  getLuminance,
  getVisibilityScore,
  hexToRgb,
} from "@/lib/colorUtils"
import { ColorSlice, EditorStore } from "@/types/store.types"
import { IText, Shadow } from "fabric"
import { StateCreator } from "zustand"

export const createColorSlice: StateCreator<EditorStore, [], [], ColorSlice> = (
  set,
  get
) => ({
  imagePalette: [],
  contrastStats: null,
  isPickingColor: false,
  colorPickerTarget: null,
  pickerSnapshot: null,
  colorPickerActiveObject: null,

  setImagePalette: (colors) => set({ imagePalette: colors }),

  applyTextStyle: (key, value) => {
    const { canvas, activeObject, saveHistoryState, calculateContrast } = get()
    if (
      !canvas ||
      !activeObject ||
      activeObject.type !== "i-text" ||
      activeObject.lockMovementX
    )
      return

    const textObj = activeObject as IText

    // Support applying styles to only a highlighted section of text if the user is currently editing
    if (textObj.isEditing && textObj.selectionStart !== textObj.selectionEnd) {
      textObj.setSelectionStyles({ [key]: value })
    } else {
      // Otherwise apply to the entire text block
      textObj.set(key, value)
    }

    canvas.requestRenderAll()
    calculateContrast()
    saveHistoryState()
  },

  getActiveSelectionStyle: (key) => {
    const { activeObject } = get()
    if (!activeObject || activeObject.type !== "i-text") return null

    const textObj = activeObject as IText

    // Extract the style of the currently highlighted character if editing
    if (textObj.isEditing && textObj.selectionStart !== textObj.selectionEnd) {
      const style = textObj.getSelectionStyles(
        textObj.selectionStart || 0,
        (textObj.selectionStart || 0) + 1
      )?.[0]
      return style?.[key as keyof typeof style] ?? textObj.get(key as any)
    }
    return textObj.get(key as any)
  },

  startColorPicker: (target) => {
    const { canvas } = get()
    let snapshot: HTMLCanvasElement | null = null
    const activeObj = canvas?.getActiveObject() || null

    if (canvas) {
      try {
        // Temporarily hide bounding boxes/controls before taking the snapshot,
        // so the user doesn't accidentally sample the blue UI border color.
        let prevControls = false
        let prevBorders = false

        if (activeObj) {
          prevControls = activeObj.hasControls ?? true
          prevBorders = activeObj.hasBorders ?? true
          activeObj.set({ hasControls: false, hasBorders: false })
          canvas.renderAll()
        }

        snapshot = canvas.toCanvasElement() // Capture the canvas into a raw HTML Canvas element

        // Restore UI controls immediately
        if (activeObj) {
          activeObj.set({ hasControls: prevControls, hasBorders: prevBorders })
          canvas.renderAll()
        }
      } catch (e) {
        console.error("Failed to generate picker snapshot", e)
      }
    }

    set({
      isPickingColor: true,
      colorPickerTarget: target,
      pickerSnapshot: snapshot,
      colorPickerActiveObject: activeObj,
    })
  },

  stopColorPicker: () => {
    set({
      isPickingColor: false,
      colorPickerTarget: null,
      pickerSnapshot: null,
      colorPickerActiveObject: null,
    })
  },

  getCanvasColor: (x, y) => {
    const { pickerSnapshot } = get()
    if (!pickerSnapshot) return null

    try {
      // willReadFrequently optimizes the browser for high-frequency pixel extraction
      const ctx = pickerSnapshot.getContext("2d", { willReadFrequently: true })
      if (!ctx) return null

      // Clamp coordinates to ensure we don't request pixels outside the canvas bounds
      const px = Math.max(0, Math.min(Math.round(x), pickerSnapshot.width - 1))
      const py = Math.max(0, Math.min(Math.round(y), pickerSnapshot.height - 1))

      const pixelData = ctx.getImageData(px, py, 1, 1).data
      const [r, g, b, a] = pixelData

      // Return pure black if clicking on a transparent area
      if (a === 0) return "#000000"

      // Convert RGB array to HEX string
      return (
        "#" +
        [r, g, b]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()
      )
    } catch (e) {
      return null
    }
  },

  sampleCanvasColor: (x, y) => {
    const {
      canvas,
      colorPickerTarget,
      colorPickerActiveObject,
      applyTextStyle,
      calculateContrast,
      saveHistoryState,
      getCanvasColor,
      stopColorPicker,
    } = get()

    if (!canvas || !colorPickerTarget) return

    const hex = getCanvasColor(x, y)
    if (!hex) {
      stopColorPicker()
      return
    }

    // Restore the object focus in case clicking the background disabled the active selection
    const activeObj = colorPickerActiveObject || canvas.getActiveObject()
    if (activeObj) {
      if (canvas.getActiveObject() !== activeObj) {
        canvas.setActiveObject(activeObj)
        set({ activeObject: activeObj })
      }

      // Apply the sampled color to the requested target property
      if (colorPickerTarget === "fill") {
        applyTextStyle("fill", hex)
      } else if (colorPickerTarget === "stroke") {
        applyTextStyle("stroke", hex)
      } else if (colorPickerTarget === "shadow") {
        const currentShadow = activeObj.get("shadow") as Shadow | null
        activeObj.set(
          "shadow",
          currentShadow
            ? new Shadow({ ...currentShadow, color: hex })
            : new Shadow({ color: hex, blur: 15, offsetX: 4, offsetY: 4 })
        )
        canvas.requestRenderAll()
        calculateContrast()
        saveHistoryState()
      }
    }

    stopColorPicker()
  },

  pickColor: async (target) => {
    const {
      startColorPicker,
      applyTextStyle,
      calculateContrast,
      saveHistoryState,
      canvas,
    } = get()

    // Try using the modern browser native EyeDropper API first (allows picking colors from outside the canvas)
    if ("EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper()
        const result = await eyeDropper.open()
        const color = result.sRGBHex.toUpperCase()

        const activeObj = canvas?.getActiveObject()
        if (!activeObj) return

        if (target === "fill") {
          applyTextStyle("fill", color)
        } else if (target === "stroke") {
          applyTextStyle("stroke", color)
        } else if (target === "shadow") {
          const currentShadow = activeObj.get("shadow") as Shadow | null
          activeObj.set(
            "shadow",
            currentShadow
              ? new Shadow({ ...currentShadow, color })
              : new Shadow({ color, blur: 15, offsetX: 4, offsetY: 4 })
          )
          canvas?.requestRenderAll()
          calculateContrast()
          saveHistoryState()
        }
      } catch (e) {
        // Fallback to our custom canvas-only color picker if native API is blocked/cancelled
        startColorPicker(target)
      }
    } else {
      // Fallback for Firefox / Safari which don't support EyeDropper yet
      startColorPicker(target)
    }
  },

  calculateContrast: () => {
    const { canvas, activeObject } = get()

    // Contrast only applies to Text layers
    if (!canvas || !activeObject || activeObject.type !== "i-text") {
      set({ contrastStats: null })
      return
    }

    // Step 1: Temporarily hide the text object so we can sample the exact background color beneath it
    activeObject.set("visible", false)
    canvas.renderAll()

    try {
      const rect = activeObject.getBoundingRect()
      const ctx = canvas.getContext()
      const retinaScaling = canvas.getRetinaScaling() // Handle high-DPI displays properly

      // Convert Fabric coordinates to actual canvas device pixels
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

      // Extract all pixels currently sitting in the bounding box area of the text
      const imageData = ctx.getImageData(left, top, width, height)

      // Step 2: Unhide the text immediately. Because this happens in the same JS execution frame, the user never sees a flicker.
      activeObject.set("visible", true)
      canvas.renderAll()

      let r = 0,
        g = 0,
        b = 0,
        count = 0

      // Step 3: Average the RGB values to get the dominant background color.
      // We increment by 16 (skipping 4 pixels at a time) for a massive performance boost,
      // ensuring the UI doesn't lag while dragging text around.
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

      const textFill = (activeObject.get("fill") as string) || "#FFFFFF"
      const fontSize = (activeObject.get("fontSize") as number) || 40
      const rawWeight = activeObject.get("fontWeight")
      const fontWeight =
        typeof rawWeight === "number"
          ? rawWeight
          : rawWeight === "bold"
            ? 700
            : 400

      // Step 4: Run standard WCAG formula to determine readability scores
      const contrastRatio = getContrastRatio(textFill, bgHex)
      const score = getVisibilityScore(contrastRatio, fontSize, fontWeight)
      const badge = getComplianceBadge(contrastRatio, fontSize, fontWeight)

      set({
        contrastStats: { ratio: contrastRatio, score, badge, bgColor: bgHex },
      })
    } catch (error) {
      // Failsafe to ensure object is never permanently invisible if something crashes
      activeObject.set("visible", true)
      canvas.renderAll()
      set({ contrastStats: null })
    }
  },

  autoColorText: () => {
    const { activeObject, contrastStats, applyTextStyle } = get()
    if (!activeObject || activeObject.type !== "i-text" || !contrastStats)
      return

    const bgRgb = hexToRgb(contrastStats.bgColor)

    // Calculates relative brightness (Luminance) of the background (0.0 to 1.0)
    const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b)

    // Standard WCAG breakpoint: if background luminance > 0.179, it's considered "light", so we use Black text. Otherwise use White.
    const optimalTextColor = bgLuminance > 0.179 ? "#000000" : "#FFFFFF"

    applyTextStyle("fill", optimalTextColor)
  },
})
