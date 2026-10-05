import {
  analyseRegion,
  buildReport,
  rankColours,
  type RegionStats,
  type ReportInput,
} from "@/lib/visibility"
import { ColorSlice, EditorStore } from "@/types/store.types"
import { IText, Shadow } from "fabric"
import { StateCreator } from "zustand"

/**
 * Roughly how many pixels to inspect per pass.
 *
 * The region under a quote can be over a million pixels on a 1080px artboard.
 * Walking all of them on every pointer move is what made dragging text feel
 * heavy, and it buys nothing: a percentile of a 20k-pixel sample is already
 * stable to well under a percent.
 */
const TARGET_SAMPLES = 20_000

/** Frame handle for `scheduleContrast`, module-scoped so it survives renders. */
let contrastFrame: number | null = null

/** States the object can leave the region sample in. */
function readRegion(
  canvas: NonNullable<EditorStore["canvas"]>,
  rect: { left: number; top: number; width: number; height: number },
  quality: "fast" | "full"
): RegionStats {
  const retina = canvas.getRetinaScaling()
  const ctx = canvas.getContext()

  const canvasWidth = canvas.getWidth() * retina
  const canvasHeight = canvas.getHeight() * retina

  const left = Math.max(0, Math.floor(rect.left * retina))
  const top = Math.max(0, Math.floor(rect.top * retina))
  const width = Math.max(1, Math.min(Math.ceil(rect.width * retina), canvasWidth - left))
  const height = Math.max(1, Math.min(Math.ceil(rect.height * retina), canvasHeight - top))

  const data = ctx.getImageData(left, top, width, height).data

  const pixels = width * height
  const budgeted = Math.sqrt(pixels / TARGET_SAMPLES)
  const floor = quality === "fast" ? 3 : 1
  const stride = Math.max(floor, Math.floor(budgeted))

  return analyseRegion(data, { stride })
}

export const createColorSlice: StateCreator<EditorStore, [], [], ColorSlice> = (
  set,
  get
) => ({
  imagePalette: [],
  visibility: null,
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
    saveHistoryState(`Change ${key}`, { coalesceKey: `style:${key}` })
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

  calculateContrast: (quality = "full") => {
    const { canvas, activeObject } = get()

    // Readability only means anything for text.
    if (!canvas || !activeObject || activeObject.type !== "i-text") {
      set({ visibility: null })
      return
    }

    const text = activeObject as IText
    const shadow = text.get("shadow") as Shadow | null

    // Fabric scales through scaleX/scaleY and leaves fontSize untouched, so a
    // quote dragged from 40px to 200px used to report 40px — which meant the
    // size bonus, and the choice of contrast threshold, were both wrong.
    const scale = Math.abs(text.scaleX ?? 1)
    const fontSize = ((text.get("fontSize") as number) || 40) * scale

    const rawWeight = text.get("fontWeight")
    const fontWeight =
      typeof rawWeight === "number"
        ? rawWeight
        : rawWeight === "bold"
          ? 700
          : 400

    const strokeWidth = (text.get("strokeWidth") as number) || 0

    // Hide the text so the sample is of what is actually behind it.
    text.set("visible", false)
    canvas.renderAll()

    let region: RegionStats
    try {
      region = readRegion(canvas, text.getBoundingRect(), quality)
    } catch (error) {
      console.error("Could not sample the region behind the text:", error)
      set({ visibility: null })
      return
    } finally {
      // Runs in the same frame, so the user never sees a flicker — and it runs
      // even if sampling threw, so the text can never be left invisible.
      text.set("visible", true)
      canvas.renderAll()
    }

    const input: ReportInput = {
      region,
      fill: (text.get("fill") as string) || "#FFFFFF",
      stroke: strokeWidth > 0 ? (text.get("stroke") as string) : undefined,
      strokeWidth,
      shadowColor: shadow?.color,
      shadowBlur: shadow?.blur,
      shadowOffset: Math.abs(shadow?.offsetX ?? 0) + Math.abs(shadow?.offsetY ?? 0),
      fontSize,
      fontWeight,
    }

    set({ visibility: buildReport(input) })
  },

  /**
   * Frame-throttled recalculation.
   *
   * `object:moving` fires on every pointer event, and each pass costs a GPU
   * readback. Collapsing those to one per frame is what makes dragging cheap;
   * the caller still does a full-precision pass on `object:modified`.
   */
  scheduleContrast: (quality = "fast") => {
    if (typeof window === "undefined") return
    if (contrastFrame !== null) return

    contrastFrame = window.requestAnimationFrame(() => {
      contrastFrame = null
      get().calculateContrast(quality)
    })
  },

  autoColorText: () => {
    const { activeObject, visibility, imagePalette, applyTextStyle } = get()
    if (!activeObject || activeObject.type !== "i-text" || !visibility) return

    // Ranked rather than filtered: the previous version discarded every
    // candidate below 4.5:1 even for display type, where WCAG asks for 3:1, so
    // it rejected good colours on the user's behalf.
    const [best] = rankColours(visibility, imagePalette, 1)
    if (best) applyTextStyle("fill", best.color)
  },
})
