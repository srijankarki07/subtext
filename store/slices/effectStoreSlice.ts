import {
  CINEMATIC_PRESETS,
  getDuotoneMatrix,
  getWarmthMatrix,
} from "@/lib/filters"
import { EditorStore, EffectSlice } from "@/types/store.types"
import { FabricImage, filters, Gradient, Rect } from "fabric"
import { StateCreator } from "zustand"

// Helper to convert hex to rgba for gradient transparency
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export const createEffectSlice: StateCreator<
  EditorStore,
  [],
  [],
  EffectSlice
> = (set, get) => ({
  grainIntensity: 0,
  gradientOpacity: 0,
  // Defaults match the full-strength duotone, so nothing changes visually
  // until the intensity is touched.
  duotoneLight: "#FF453A",
  duotoneDark: "#0A84FF",
  duotoneIntensity: 100,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  vignettes: [],
  blurZones: [],
  letterboxes: [],

  // --- VIGNETTES ---
  addVignette: (initialConfig) => {
    const { canvas, vignettes, saveHistoryState } = get()
    if (!canvas) return

    const w = canvas.getWidth()
    const h = canvas.getHeight()
    const id = "vignette-" + Date.now()

    const config = {
      id,
      opacity: initialConfig?.opacity ?? 50,
      type: initialConfig?.type ?? ("radial" as const),
      color: initialConfig?.color ?? "#000000",
    }

    // Explicitly anchor to top-left corner (0,0) so it covers 100% of width and height
    const vignette = new Rect({
      left: 0,
      top: 0,
      originX: "left",
      originY: "top",
      width: w,
      height: h,
      selectable: true,
      evented: true,
      cornerColor: "white",
      transparentCorners: false,
    })

    ;(vignette as any).id = id
    ;(vignette as any).isEffect = true
    canvas.add(vignette)
    vignette.setCoords()

    set({ vignettes: [...vignettes, config] })
    get().updateVignette(id, config)

    canvas.bringObjectToFront(vignette)
    canvas.requestRenderAll()
    saveHistoryState()
  },

  updateVignette: (id, updates) => {
    const { canvas, vignettes } = get()
    if (!canvas) return

    const updatedVignettes = vignettes.map((v) =>
      v.id === id ? { ...v, ...updates } : v
    )
    set({ vignettes: updatedVignettes })

    const state = updatedVignettes.find((v) => v.id === id)
    const obj = canvas.getObjects().find((o) => (o as any).id === id) as Rect

    if (state && obj) {
      const w = canvas.getWidth()
      const h = canvas.getHeight()

      obj.set({
        originX: "left",
        originY: "top",
        width: obj.width && obj.width > 50 ? obj.width : w,
        height: obj.height && obj.height > 50 ? obj.height : h,
        fill: new Gradient({
          type: state.type,
          gradientUnits: "percentage", // Percentages ensure 100% full coverage on any resolution
          coords:
            state.type === "linear"
              ? { x1: 0, y1: 0, x2: 0, y2: 1 } // Full top-to-bottom
              : {
                  x1: 0.5,
                  y1: 0.5,
                  r1: 0,
                  x2: 0.5,
                  y2: 0.5,
                  r2: 0.7, // Radiates out to cover all 4 corners
                },
          colorStops: [
            { offset: 0, color: hexToRgba(state.color, 0) },
            { offset: 1, color: hexToRgba(state.color, state.opacity / 100) },
          ],
        }),
      })
      obj.setCoords()
      canvas.requestRenderAll()
    }
  },

  removeVignette: (id) => {
    const { canvas, vignettes, saveHistoryState } = get()
    if (!canvas) return
    const obj = canvas.getObjects().find((o) => (o as any).id === id)
    if (obj) canvas.remove(obj)
    set({ vignettes: vignettes.filter((v) => v.id !== id) })
    saveHistoryState()
  },

  // --- BLUR ZONES ---
  addBlurZone: async () => {
    const { canvas, artboard, blurZones, saveHistoryState } = get()
    if (!canvas) return

    const bg = canvas
      .getObjects()
      .find((o) => o.type === "image" && !(o as any).isEffect) as FabricImage
    if (!bg) return

    const id = "blur-handle-" + Date.now()
    const overlayId = "blur-overlay-" + Date.now()

    const blurOverlay = await bg.clone()
    ;(blurOverlay as any).id = overlayId
    ;(blurOverlay as any).isEffect = true
    blurOverlay.set({ selectable: false, evented: false })

    // Append the blur to the background's existing filter chain rather than
    // replacing it. Replacing it discarded the colour grade inside the blurred
    // box, so the region was visibly a different grade from the rest of the
    // photo.
    const gradedFilters = ((bg.filters ?? []) as any[]).filter(
      (filter) => filter.type !== "Blur"
    )
    ;(blurOverlay as FabricImage).filters = [
      ...gradedFilters,
      new filters.Blur({ blur: 0.3 }),
    ]
    ;(blurOverlay as FabricImage).applyFilters()

    const blurHandle = new Rect({
      left: artboard.width / 4,
      top: artboard.height * 0.6,
      width: artboard.width / 2,
      height: artboard.height * 0.3,
      fill: "transparent",
      // Restrained on purpose: this is an editor affordance, and at 4px and 80%
      // white it read as part of the artwork.
      stroke: "rgba(255,255,255,0.45)",
      strokeWidth: 2,
      strokeDashArray: [8, 6],
      selectable: true,
      evented: true,
      cornerColor: "rgba(255,255,255,0.85)",
      cornerStrokeColor: "rgba(0,0,0,0.4)",
      cornerSize: 9,
      transparentCorners: false,
    })
    ;(blurHandle as any).id = id
    ;(blurHandle as any).isEffect = true
    // Never rendered into an export, but kept in the document because the clip
    // path is rebound from it on load.
    ;(blurHandle as any).editorOnly = true

    const updateClipPath = () => {
      blurOverlay.set({
        clipPath: new Rect({
          left: blurHandle.left,
          top: blurHandle.top,
          width: blurHandle.getScaledWidth(),
          height: blurHandle.getScaledHeight(),
          absolutePositioned: true,
        }),
      })
      canvas.requestRenderAll()
    }

    updateClipPath()
    blurHandle.on("moving", updateClipPath)
    blurHandle.on("scaling", updateClipPath)

    canvas.add(blurOverlay, blurHandle)
    canvas.sendObjectToBack(blurOverlay)
    canvas.bringObjectForward(blurOverlay)

    set({ blurZones: [...blurZones, { id, overlayId, opacity: 30 }] })
    canvas.setActiveObject(blurHandle)
    saveHistoryState()
  },

  updateBlurZone: (id, opacity) => {
    const { canvas, blurZones } = get()
    if (!canvas) return

    const updated = blurZones.map((b) => (b.id === id ? { ...b, opacity } : b))
    set({ blurZones: updated })

    const state = updated.find((b) => b.id === id)
    if (!state) return

    const blurOverlay = canvas
      .getObjects()
      .find((o) => (o as any).id === state.overlayId) as FabricImage
    if (blurOverlay && blurOverlay.filters) {
      const blurFilter = blurOverlay.filters.find(
        (f) => f.type === "Blur"
      ) as any
      if (blurFilter) {
        blurFilter.blur = opacity / 100
        blurOverlay.applyFilters()
        canvas.requestRenderAll()
      }
    }
  },

  removeBlurZone: (id) => {
    const { canvas, blurZones, saveHistoryState } = get()
    if (!canvas) return
    const state = blurZones.find((b) => b.id === id)
    if (!state) return

    const handle = canvas.getObjects().find((o) => (o as any).id === state.id)
    const overlay = canvas
      .getObjects()
      .find((o) => (o as any).id === state.overlayId)

    if (handle) canvas.remove(handle)
    if (overlay) canvas.remove(overlay)

    set({ blurZones: blurZones.filter((b) => b.id !== id) })
    saveHistoryState()
  },

  // --- LETTERBOX ---
  addLetterbox: (thicknessRatio) => {
    const { canvas, letterboxes, saveHistoryState } = get()
    if (!canvas) return

    const w = canvas.getWidth()
    const h = canvas.getHeight()
    const thickness = h * (thicknessRatio / 100)

    const id = "letterbox-" + Date.now()
    const topId = id + "-top"
    const bottomId = id + "-bottom"

    // Top Bar: Anchored top-left, spans 100% width
    const topBar = new Rect({
      left: 0,
      top: 0,
      originX: "left",
      originY: "top",
      width: w,
      height: thickness,
      fill: "black",
      selectable: true,
      evented: true,
      lockMovementX: true,
      lockScalingX: true,
    })

    // Bottom Bar: Anchored top-left, placed flush at (h - thickness), spans 100% width
    const bottomBar = new Rect({
      left: 0,
      top: h - thickness,
      originX: "left",
      originY: "top",
      width: w,
      height: thickness,
      fill: "black",
      selectable: true,
      evented: true,
      lockMovementX: true,
      lockScalingX: true,
    })

    ;(topBar as any).id = topId
    ;(topBar as any).isEffect = true
    ;(bottomBar as any).id = bottomId
    ;(bottomBar as any).isEffect = true

    topBar.setCoords()
    bottomBar.setCoords()

    canvas.add(topBar, bottomBar)
    canvas.bringObjectToFront(topBar)
    canvas.bringObjectToFront(bottomBar)

    set({ letterboxes: [...letterboxes, { id, topId, bottomId }] })
    canvas.requestRenderAll()
    saveHistoryState()
  },

  // --- SHADOW GRADIENT OVERLAY ---
  setGradientOverlay: (opacity, type, color1, color2) => {
    set({ gradientOpacity: opacity })
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    let gradOverlay = canvas
      .getObjects()
      .find((o) => (o as any).id === "gradient-overlay")

    if (opacity === 0) {
      if (gradOverlay) canvas.remove(gradOverlay)
    } else {
      const w = canvas.getWidth()
      const h = canvas.getHeight()

      if (!gradOverlay) {
        gradOverlay = new Rect({
          left: 0,
          top: 0,
          originX: "left",
          originY: "top",
          width: w,
          height: h,
          selectable: false,
          evented: false,
        })
        ;(gradOverlay as any).id = "gradient-overlay"
        ;(gradOverlay as any).isEffect = true
        canvas.add(gradOverlay)
      }

      gradOverlay.set({
        left: 0,
        top: 0,
        originX: "left",
        originY: "top",
        width: w,
        height: h,
        opacity: opacity / 100,
        fill: new Gradient({
          type: type,
          gradientUnits: "percentage",
          coords:
            type === "linear"
              ? { x1: 0, y1: 0, x2: 0, y2: 1 }
              : { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.7 },
          colorStops: [
            { offset: 0, color: color1 },
            { offset: 1, color: color2 },
          ],
        }),
      })

      gradOverlay.setCoords()
      canvas.sendObjectToBack(gradOverlay)
      canvas.bringObjectForward(gradOverlay)
    }

    canvas.requestRenderAll()
    saveHistoryState()
  },

  removeLetterbox: (id) => {
    const { canvas, letterboxes, saveHistoryState } = get()
    if (!canvas) return
    const state = letterboxes.find((l) => l.id === id)
    if (!state) return

    const top = canvas.getObjects().find((o) => (o as any).id === state.topId)
    const bottom = canvas
      .getObjects()
      .find((o) => (o as any).id === state.bottomId)
    if (top) canvas.remove(top)
    if (bottom) canvas.remove(bottom)

    set({ letterboxes: letterboxes.filter((l) => l.id !== id) })
    saveHistoryState()
  },

  setGrainIntensity: (intensity) => set({ grainIntensity: intensity }),

  applyImageFilter: (type, options) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return
    const bg = canvas
      .getObjects()
      .find((o) => o.type === "image" && !(o as any).isEffect) as FabricImage
    if (!bg) return
    if (!bg.filters) bg.filters = []
    let filterIndex = bg.filters.findIndex((f) => f.type === type)

    if (filterIndex > -1) Object.assign(bg.filters[filterIndex], options)
    else {
      let FilterClass: any
      if (type === "Brightness") FilterClass = filters.Brightness
      if (type === "Contrast") FilterClass = filters.Contrast
      if (type === "Saturation") FilterClass = filters.Saturation
      if (FilterClass) bg.filters.push(new FilterClass(options))
    }
    bg.applyFilters()
    canvas.requestRenderAll()
    saveHistoryState()
  },

  applyPreset: (matrix) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return
    const bg = canvas
      .getObjects()
      .find((o) => o.type === "image" && !(o as any).isEffect) as FabricImage
    if (!bg || !bg.filters) return

    bg.filters = bg.filters.filter((f) => f.type !== "ColorMatrix")
    if (matrix !== CINEMATIC_PRESETS["None"])
      bg.filters.push(new filters.ColorMatrix({ matrix }))
    bg.applyFilters()
    canvas.requestRenderAll()
    saveHistoryState()
  },

  applyWarmth: (value) => get().applyPreset(getWarmthMatrix(value)),
  /**
   * Applies a duotone and records the settings.
   *
   * The settings are stored, not just applied, so the panel reflects whatever
   * the image is actually graded with — including when a template sets it.
   */
  applyDuotone: (lightHex, darkHex, intensity = get().duotoneIntensity) => {
    set({
      duotoneLight: lightHex,
      duotoneDark: darkHex,
      duotoneIntensity: intensity,
    })
    get().applyPreset(getDuotoneMatrix(lightHex, darkHex, intensity))
  },

  setDuotoneColour: (which, hex) => {
    const { duotoneLight, duotoneDark, duotoneIntensity } = get()
    get().applyDuotone(
      which === "light" ? hex : duotoneLight,
      which === "dark" ? hex : duotoneDark,
      duotoneIntensity
    )
  },

  setDuotoneIntensity: (intensity) => {
    const { duotoneLight, duotoneDark } = get()
    get().applyDuotone(duotoneLight, duotoneDark, intensity)
  },

  setAdjustment: (which, value) => {
    set({ [which]: value })
    if (which === "warmth") get().applyWarmth(value)
    else {
      get().applyImageFilter(
        which.charAt(0).toUpperCase() + which.slice(1),
        { [which]: value }
      )
    }
  },

  resetEffect: (category) => {
    const {
      setGradientOverlay,
      setGrainIntensity,
      applyPreset,
      applyImageFilter,
      vignettes,
      blurZones,
      letterboxes,
      removeVignette,
      removeBlurZone,
      removeLetterbox,
    } = get()

    if (category === "adjustments" || category === "all") {
      applyImageFilter("Brightness", { brightness: 0 })
      applyImageFilter("Contrast", { contrast: 0 })
      applyImageFilter("Saturation", { saturation: 0 })
      set({ brightness: 0, contrast: 0, saturation: 0, warmth: 0 })
    }
    if (category === "cinematic" || category === "all") {
      applyPreset(CINEMATIC_PRESETS["None"])
      set({ duotoneIntensity: 0 })
    }
    if (category === "atmospherics" || category === "all") {
      setGradientOverlay(0, "linear", "transparent", "black")
      setGrainIntensity(0)
      vignettes.forEach((v) => removeVignette(v.id))
      blurZones.forEach((b) => removeBlurZone(b.id))
      letterboxes.forEach((l) => removeLetterbox(l.id))
    }
  },
})
