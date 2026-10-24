import {
  analyseRegion,
  buildReport,
  rankColours,
  type MoveCandidate,
  type RegionStats,
  type Recommendation,
  type VisibilityReport,
} from "@/lib/visibility"
import { textPresetById } from "@/lib/textPresets"
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
  const width = Math.max(
    1,
    Math.min(Math.ceil(rect.width * retina), canvasWidth - left)
  )
  const height = Math.max(
    1,
    Math.min(Math.ceil(rect.height * retina), canvasHeight - top)
  )

  const data = ctx.getImageData(left, top, width, height).data

  const pixels = width * height
  const budgeted = Math.sqrt(pixels / TARGET_SAMPLES)
  const floor = quality === "fast" ? 3 : 1
  const stride = Math.max(floor, Math.floor(budgeted))

  return analyseRegion(data, { stride })
}

/**
 * Whether a report is readable *without leaning on a weak effect*.
 *
 * The report's badge is decided by the best edge, and a wide soft shadow can
 * technically carry the number while the glyphs themselves stay white on a
 * white wall. A fill or a real outline stands on its own; a glow that the
 * engine itself discounts below 80% does not. Templates use this stricter test.
 */
function passesReadability(report: VisibilityReport): boolean {
  if (report.badge === "FAIL") return false
  const best = report.edges.reduce((a, b) => (b.ratio > a.ratio ? b : a))
  return best.reliability >= 0.8
}

/**
 * The readability report for one text object.
 *
 * Hides the text for the length of the sample so the pixels come from what is
 * actually behind it, and restores it in a `finally` so a sampling failure can
 * never leave the layer invisible.
 */
function reportForText(
  canvas: NonNullable<EditorStore["canvas"]>,
  text: IText,
  quality: "fast" | "full" = "full"
): VisibilityReport | null {
  const shadow = text.get("shadow") as Shadow | null

  // Fabric scales through scaleX/scaleY and leaves fontSize untouched, so a
  // quote dragged from 40px to 200px would otherwise report 40px.
  const scale = Math.abs(text.scaleX ?? 1)
  const fontSize = ((text.get("fontSize") as number) || 40) * scale

  const rawWeight = text.get("fontWeight")
  const fontWeight =
    typeof rawWeight === "number" ? rawWeight : rawWeight === "bold" ? 700 : 400

  const strokeWidth = (text.get("strokeWidth") as number) || 0

  text.set("visible", false)
  canvas.renderAll()

  let region: RegionStats
  try {
    region = readRegion(canvas, text.getBoundingRect(), quality)
  } catch (error) {
    console.error("Could not sample the region behind the text:", error)
    return null
  } finally {
    text.set("visible", true)
    canvas.renderAll()
  }

  return buildReport({
    region,
    fill: (text.get("fill") as string) || "#FFFFFF",
    stroke: strokeWidth > 0 ? (text.get("stroke") as string) : undefined,
    strokeWidth,
    shadowColor: shadow?.color,
    shadowBlur: shadow?.blur,
    shadowOffset:
      Math.abs(shadow?.offsetX ?? 0) + Math.abs(shadow?.offsetY ?? 0),
    fontSize,
    fontWeight,
  })
}

/**
 * The vertical positions a suggestion may propose.
 *
 * Mid-band centres rather than the exact thirds, so a block that lands here has
 * breathing room above and below instead of touching an edge.
 */
const MOVE_BANDS = [
  { id: "upper", title: "Move to the upper third", fraction: 0.18 },
  { id: "middle", title: "Move to the middle", fraction: 0.5 },
  { id: "lower", title: "Move to the lower third", fraction: 0.82 },
] as const

/**
 * Measures the same text at the positions it could move to.
 *
 * Same technique as `reportForText`: hide the text, read the pixels, restore.
 * Rotated text is skipped - the bounding box no longer matches the layer, and
 * the score at a new position would describe a shape the user does not have.
 */
function moveCandidatesFor(
  canvas: NonNullable<EditorStore["canvas"]>,
  text: IText
): MoveCandidate[] {
  if (Math.abs(text.angle ?? 0) > 0.5) return []

  const canvasHeight = canvas.getHeight()
  const rect = text.getBoundingRect()
  if (canvasHeight <= 0 || rect.height <= 0 || rect.height >= canvasHeight) {
    return []
  }

  const centre = rect.top + rect.height / 2
  const candidates: MoveCandidate[] = []

  text.set("visible", false)
  canvas.renderAll()
  try {
    for (const band of MOVE_BANDS) {
      const target = canvasHeight * band.fraction
      // A position the text already occupies is not a suggestion.
      if (Math.abs(target - centre) < canvasHeight * 0.08) continue

      const top = target - rect.height / 2
      if (top < 0 || top + rect.height > canvasHeight) continue

      candidates.push({
        id: band.id,
        title: band.title,
        top: (text.top ?? 0) + (target - centre),
        region: readRegion(
          canvas,
          { left: rect.left, top, width: rect.width, height: rect.height },
          "full"
        ),
      })
    }
  } catch (error) {
    console.error("Could not measure the move suggestions:", error)
  } finally {
    text.set("visible", true)
    canvas.renderAll()
  }

  return candidates
}

export const createColorSlice: StateCreator<EditorStore, [], [], ColorSlice> = (
  set,
  get
) => ({
  imagePalette: [],
  visibility: null,
  moveCandidates: [],
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
      (activeObject as { locked?: boolean }).locked
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

  /**
   * Runs one suggestion.
   *
   * Transactional because a stroke is two property writes and an undo should
   * put the text back in one step, not two. Every kind maps onto an action the
   * panels already call, so a suggestion cannot do something a user could not
   * have done by hand.
   */
  applyRecommendation: (recommendation) => {
    const {
      canvas,
      activeObject,
      beginHistoryTransaction,
      endHistoryTransaction,
    } = get()
    const apply = recommendation.apply
    if (!canvas || !apply || activeObject?.type !== "i-text") return
    if ((activeObject as { locked?: boolean }).locked) return

    const text = activeObject as IText

    beginHistoryTransaction(recommendation.title)
    try {
      switch (apply.kind) {
        case "fill":
          get().applyTextStyle("fill", apply.color)
          break
        case "stroke":
          get().applyTextStyle("stroke", apply.color)
          get().applyTextStyle("strokeWidth", apply.width)
          break
        case "shadow":
          get().applyTextStyle(
            "shadow",
            new Shadow({
              color: apply.color,
              blur: apply.blur,
              offsetX: 0,
              offsetY: apply.offset,
            })
          )
          break
        case "gradient":
          get().setGradientOverlay(
            apply.opacity,
            "linear",
            "transparent",
            "black"
          )
          break
        case "move":
          text.set({ top: apply.top })
          text.setCoords()
          canvas.requestRenderAll()
          get().saveHistoryState(recommendation.title)
          break
      }
    } finally {
      endHistoryTransaction()
    }

    get().calculateContrast()
  },

  applyTextPreset: (id) => {
    const { canvas, activeObject, saveHistoryState, calculateContrast } = get()
    if (
      !canvas ||
      !activeObject ||
      activeObject.type !== "i-text" ||
      (activeObject as { locked?: boolean }).locked
    ) {
      return
    }

    const preset = textPresetById(id)
    if (!preset) return

    const textObj = activeObject as IText
    const { shadow, ...style } = preset.style

    // The preset is the whole look, so every property it names is set -
    // including the ones it clears. Applying "Editorial" after "Neon" must
    // remove the glow rather than leave it behind.
    textObj.set({
      ...style,
      shadow: shadow ? new Shadow(shadow) : null,
    })

    canvas.requestRenderAll()
    calculateContrast()
    // A run of presets is one undo step, the way a colour drag is.
    saveHistoryState(`Apply ${preset.name}`, {
      coalesceKey: "text-preset",
    })
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
      set({ visibility: null, moveCandidates: [] })
      return
    }

    const report = reportForText(canvas, activeObject as IText, quality)
    set({
      visibility: report,
      // The candidates cost three more region samples, so they are only
      // measured for the settled report - not on every frame of a drag.
      moveCandidates:
        report && quality === "full"
          ? moveCandidatesFor(canvas, activeObject as IText)
          : [],
    })
  },

  /**
   * Makes one text block readable against what is actually behind it.
   *
   * Called for every block a template creates. `force` is for the explicit
   * Smart auto-colour button, which means "choose the best" even when the
   * current colour technically passes; templates use the default so a working
   * art direction is left alone.
   *
   * The fallback matters more than it looks: a single fill colour cannot pass
   * against a background that is both black and white, which is exactly the
   * photo-in-the-middle case this engine exists for. When no fill passes, the
   * text gets white fill, a dark outline and a dark shadow - a deterministic
   * treatment that gives the eye an edge on either background.
   */
  fitTextToBackground: (text, options = {}) => {
    const { canvas, imagePalette, saveHistoryState } = get()
    if (!canvas) return null

    const report = reportForText(canvas, text)
    if (!report) return null
    if (!options.force && passesReadability(report)) return report

    const [best] = rankColours(report, imagePalette, 1)
    if (best) {
      text.set("fill", best.color)

      // Rescore against the same region rather than re-sampling: the pixels
      // behind the text have not moved, only the colour sitting on them.
      const updated = buildReport({
        region: report.region,
        fill: best.color,
        stroke: report.applied.strokeColor,
        strokeWidth: report.applied.strokeWidth,
        shadowColor: report.applied.shadowColor,
        shadowBlur: report.applied.shadowBlur,
        shadowOffset: report.applied.shadowOffset,
        fontSize: report.fontSize,
        fontWeight: report.fontWeight,
      })

      if (passesReadability(updated)) {
        canvas.requestRenderAll()
        if (options.save) {
          saveHistoryState("Improve text contrast", {
            coalesceKey: "text-contrast",
          })
        }
        return updated
      }
    }

    text.set({
      fill: "#FFFFFF",
      stroke: "rgba(0,0,0,0.9)",
      strokeWidth: 1.5,
      shadow: new Shadow({
        color: "rgba(0,0,0,0.85)",
        blur: 18,
        offsetX: 0,
        offsetY: 6,
      }),
    })

    const fallback = buildReport({
      region: report.region,
      fill: "#FFFFFF",
      stroke: "rgba(0,0,0,0.9)",
      strokeWidth: 1.5,
      shadowColor: "rgba(0,0,0,0.85)",
      shadowBlur: 18,
      shadowOffset: 6,
      fontSize: report.fontSize,
      fontWeight: report.fontWeight,
    })

    canvas.requestRenderAll()
    if (options.save) {
      saveHistoryState("Improve text contrast", {
        coalesceKey: "text-contrast",
      })
    }
    return fallback
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
    const { activeObject } = get()
    if (!activeObject || activeObject.type !== "i-text") return

    // Recomputed rather than read from the panel's cached report: the button is
    // an explicit "fix it", and it may be pressed before a report has ever been
    // built. Forced, so it always chooses the best colour even when the current
    // one technically passes - and it falls back to an outline and shadow when
    // no fill can pass on its own.
    const report = get().fitTextToBackground(activeObject as IText, {
      force: true,
      save: true,
    })
    if (report) set({ visibility: report })
  },
})
