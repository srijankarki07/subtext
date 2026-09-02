// src/store/slices/createEffectSlice.ts

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
  vignettes: [],
  blurZones: [],
  letterboxes: [],

  // --- VIGNETTES ---
  addVignette: () => {
    const { canvas, artboard, vignettes, saveHistoryState } = get()
    if (!canvas) return

    const id = "vignette-" + Date.now()
    const newState = {
      id,
      opacity: 50,
      type: "radial" as const,
      color: "#000000",
    }

    // Create exactly at aspect ratio
    const vignette = new Rect({
      left: 0,
      top: 0,
      width: artboard.width,
      height: artboard.height,
      selectable: true,
      evented: true,
      cornerColor: "white",
      transparentCorners: false,
    })

    ;(vignette as any).id = id
    ;(vignette as any).isEffect = true
    canvas.add(vignette)

    set({ vignettes: [...vignettes, newState] })
    get().updateVignette(id, {}) // Trigger gradient build

    canvas.setActiveObject(vignette)
    canvas.bringObjectToFront(vignette)
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
      const w = obj.width || 100
      const h = obj.height || 100

      obj.set({
        fill: new Gradient({
          type: state.type,
          coords:
            state.type === "linear"
              ? { x1: 0, y1: 0, x2: 0, y2: h }
              : {
                  x1: w / 2,
                  y1: h / 2,
                  r1: 0,
                  x2: w / 2,
                  y2: h / 2,
                  r2: Math.max(w, h) / 1.5,
                },
          colorStops: [
            { offset: 0, color: hexToRgba(state.color, 0) },
            { offset: 1, color: hexToRgba(state.color, state.opacity / 100) },
          ],
        }),
      })
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

    ;(blurOverlay as FabricImage).filters = [new filters.Blur({ blur: 0.3 })]
    ;(blurOverlay as FabricImage).applyFilters()

    const blurHandle = new Rect({
      left: artboard.width / 4,
      top: artboard.height * 0.6,
      width: artboard.width / 2,
      height: artboard.height * 0.3,
      fill: "transparent",
      stroke: "rgba(255,255,255,0.8)",
      strokeWidth: 4,
      strokeDashArray: [10, 10],
      selectable: true,
      evented: true,
      cornerColor: "white",
      transparentCorners: false,
    })
    ;(blurHandle as any).id = id
    ;(blurHandle as any).isEffect = true

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
    const { canvas, artboard, letterboxes, saveHistoryState } = get()
    if (!canvas) return

    const id = "letterbox-" + Date.now()
    const topId = id + "-top"
    const bottomId = id + "-bottom"
    const thickness = artboard.height * (thicknessRatio / 100)

    const topBar = new Rect({
      left: 0,
      top: 0,
      width: artboard.width,
      height: thickness,
      fill: "black",
      selectable: true,
      evented: true,
      lockMovementX: true,
      lockScalingX: true,
    })
    const bottomBar = new Rect({
      left: 0,
      top: artboard.height - thickness,
      width: artboard.width,
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

    canvas.add(topBar, bottomBar)
    canvas.bringObjectToFront(topBar)
    canvas.bringObjectToFront(bottomBar)

    set({ letterboxes: [...letterboxes, { id, topId, bottomId }] })
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

  setGradientOverlay: (opacity, type, color1, color2) => {
    set({ gradientOpacity: opacity })
    const { canvas, artboard, saveHistoryState } = get()
    if (!canvas) return

    let gradOverlay = canvas
      .getObjects()
      .find((o) => (o as any).id === "gradient-overlay")

    if (opacity === 0) {
      if (gradOverlay) canvas.remove(gradOverlay)
    } else {
      if (!gradOverlay) {
        gradOverlay = new Rect({
          left: 0,
          top: 0,
          width: artboard.width,
          height: artboard.height,
          selectable: false,
          evented: false,
        })
        ;(gradOverlay as any).id = "gradient-overlay"
        ;(gradOverlay as any).isEffect = true
        canvas.add(gradOverlay)
      }
      gradOverlay.set({
        opacity: opacity / 100,
        fill: new Gradient({
          type: type,
          coords:
            type === "linear"
              ? { x1: 0, y1: 0, x2: 0, y2: artboard.height }
              : {
                  x1: artboard.width / 2,
                  y1: artboard.height / 2,
                  r1: 0,
                  x2: artboard.width / 2,
                  y2: artboard.height / 2,
                  r2: Math.max(artboard.width, artboard.height) / 1.5,
                },
          colorStops: [
            { offset: 0, color: color1 },
            { offset: 1, color: color2 },
          ],
        }),
      })
      canvas.sendObjectToBack(gradOverlay)
      canvas.bringObjectForward(gradOverlay)
    }
    canvas.requestRenderAll()
    saveHistoryState()
  },

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
  applyDuotone: (lightHex, darkHex) =>
    get().applyPreset(getDuotoneMatrix(lightHex, darkHex)),

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
    }
    if (category === "cinematic" || category === "all") {
      applyPreset(CINEMATIC_PRESETS["None"])
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
