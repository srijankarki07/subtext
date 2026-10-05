import {
  CINEMATIC_PRESETS,
  getDuotoneMatrix,
  getWarmthMatrix,
} from "@/lib/filters"
import { EditorStore, EffectSlice } from "@/types/store.types"
import { FabricImage, filters, Gradient, Rect } from "fabric"

import {
  BLUR_FADE_RINGS,
  BLUR_RING_ALPHA,
  applyBlurClips,
} from "@/lib/blurZone"
import { StateCreator } from "zustand"

// Helper to convert hex to rgba for gradient transparency
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Overlay ids whose clone is currently in flight.
 *
 * `buildBlurLayers` awaits `clone()`, and the Fade slider fires on every change,
 * so two builds can overlap. Both would find ring 3 missing and both would add
 * one, putting the same object in the canvas twice — which is what produced the
 * duplicate React key in the layers list.
 */
const blurLayerBuilds = new Set<string>()

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
    const {
      canvas,
      vignettes,
      beginHistoryTransaction,
      endHistoryTransaction,
    } = get()
    if (!canvas) return

    // Adding a layer is several steps — create the object, apply its gradient,
    // push it to the front, register it in the store — and `updateVignette`
    // below records one of them. The transaction keeps the final state only, so
    // the step is titled for what the user did rather than for the internal
    // call that happened to run last.
    beginHistoryTransaction("Add vignette")

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
    endHistoryTransaction()
  },

  updateVignette: (id, updates) => {
    const { canvas, vignettes, saveHistoryState } = get()
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
    saveHistoryState("Vignette", { coalesceKey: `vignette:${id}` })
  },

  removeVignette: (id) => {
    const { canvas, vignettes, saveHistoryState } = get()
    if (!canvas) return
    const obj = canvas.getObjects().find((o) => (o as any).id === id)
    if (obj) canvas.remove(obj)
    set({ vignettes: vignettes.filter((v) => v.id !== id) })
    saveHistoryState("Remove vignette")
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
    // paths are recomputed from it on load.
    ;(blurHandle as any).editorOnly = true
    ;(blurHandle as any).blurFeather = 0
    ;(blurHandle as any).overlayIds = []

    // The handle has to be on the canvas *before* the layers are built:
    // `buildBlurLayers` looks it up by id, so building first silently produced
    // no overlays at all and a hard zone did nothing.
    canvas.add(blurHandle)

    const overlays = await get().buildBlurLayers(id, 0)
    ;(blurHandle as any).overlayIds = overlays.map((o) => (o as any).id)

    applyBlurClips(canvas)

    blurHandle.on("moving", () => applyBlurClips(canvas))
    blurHandle.on("scaling", () => applyBlurClips(canvas))

    set({
      blurZones: [
        ...blurZones,
        {
          id,
          overlayIds: (blurHandle as any).overlayIds,
          blur: 30,
          feather: 0,
        },
      ],
    })
    canvas.setActiveObject(blurHandle)
    saveHistoryState("Add blur zone")
  },

  /**
   * Builds the blurred copies for a zone.
   *
   * One per ring: ring 0 is the core, matching the handle, and the rest are
   * clipped progressively wider so the blur can fade out. Rings are only built
   * when a feather is asked for, so a hard zone — the common case — costs one
   * clone rather than four.
   */
  buildBlurLayers: async (handleId, feather) => {
    const { canvas } = get()
    if (!canvas) return []

    const handle = canvas
      .getObjects()
      .find((o) => (o as any).id === handleId) as any
    if (!handle) return []

    const bg = canvas
      .getObjects()
      .find((o) => o.type === "image" && !(o as any).isEffect) as FabricImage
    if (!bg) return []

    const onCanvas = (id: string) =>
      canvas.getObjects().find((o) => (o as any).id === id) as any

    const rings = feather > 0 ? BLUR_FADE_RINGS + 1 : 1
    const layers: any[] = []

    for (let ring = 0; ring < rings; ring++) {
      const overlayId = `blur-overlay-${handleId}-${ring}`

      // Idempotent by id. A build must reuse what an earlier one made, whether
      // it finished or is still in flight.
      let overlay = onCanvas(overlayId)

      if (!overlay && !blurLayerBuilds.has(overlayId)) {
        blurLayerBuilds.add(overlayId)
        try {
          // Feather rings clone the core, which already carries the grade and
          // the blur, rather than redoing both from the artwork.
          const source = (onCanvas(`blur-overlay-${handleId}-0`) ??
            bg) as FabricImage
          const created = (await source.clone()) as any

          created.id = overlayId
          created.isEffect = true
          created.blurRing = ring
          created.overlayId = handleId
          // Same photo as the artwork, so the same stored asset.
          created.assetId = (source as any).assetId
          created.set({
            selectable: false,
            evented: false,
            opacity: ring === 0 ? 1 : BLUR_RING_ALPHA,
          })

          const gradedFilters = ((bg.filters ?? []) as any[]).filter(
            (filter) => filter.type !== "Blur"
          )
          created.filters = [...gradedFilters, new filters.Blur({ blur: 0.3 })]
          await created.applyFilters()

          // Re-check: an overlapping build may have won the race while the
          // clone was in flight, in which case that object is the keeper.
          overlay = onCanvas(overlayId) ?? created
          if (overlay === created) {
            canvas.add(created)
            canvas.sendObjectToBack(created)
            canvas.bringObjectForward(created)
          }
        } finally {
          blurLayerBuilds.delete(overlayId)
        }
      }

      // Still being built elsewhere; this call leaves it for the next one.
      if (!overlay) continue

      overlay.set({ visible: true, opacity: ring === 0 ? 1 : BLUR_RING_ALPHA })
      layers.push(overlay)
    }

    return layers
  },

  updateBlurZone: (id, blur) => {
    const { canvas, blurZones, saveHistoryState } = get()
    if (!canvas) return

    const updated = blurZones.map((b) => (b.id === id ? { ...b, blur } : b))
    set({ blurZones: updated })

    const state = updated.find((b) => b.id === id)
    if (!state) return

    state.overlayIds.forEach((overlayId) => {
      const overlay = canvas
        .getObjects()
        .find((o) => (o as any).id === overlayId) as FabricImage
      if (!overlay?.filters) return

      const blurFilter = overlay.filters.find((f) => f.type === "Blur") as any
      if (!blurFilter) return
      blurFilter.blur = blur / 100
      void overlay.applyFilters()
    })

    canvas.requestRenderAll()
    saveHistoryState("Blur radius", { coalesceKey: `blur-radius:${id}` })
  },

  setBlurZoneFeather: async (id, feather) => {
    const { canvas, blurZones, saveHistoryState } = get()
    if (!canvas) return

    const handle = canvas.getObjects().find((o) => (o as any).id === id) as any
    if (!handle) return

    ;(handle as any).blurFeather = feather
    const layers = await get().buildBlurLayers(id, feather)
    ;(handle as any).overlayIds = layers.map((layer) => (layer as any).id)

    // Feather rings that are no longer needed stay in the document but stop
    // rendering, so toggling back is instant.
    layers.forEach((layer, index) => {
      const wanted = index === 0 || feather > 0
      ;(layer as any).set({
        visible: wanted,
        opacity: index === 0 ? 1 : BLUR_RING_ALPHA,
      })
    })

    // Anything beyond the rings now in use is retired.
    canvas.getObjects().forEach((object: any) => {
      if (object.blurRing > 0 && !layers.includes(object))
        object.set({ visible: false })
    })

    const blur = blurZones.find((zone) => zone.id === id)?.blur ?? 30
    layers.forEach((layer) => {
      const blurFilter = (layer as FabricImage).filters?.find(
        (f) => f.type === "Blur"
      ) as any
      if (blurFilter) blurFilter.blur = blur / 100
    })

    set({
      blurZones: blurZones.map((zone) =>
        zone.id === id
          ? {
              ...zone,
              feather,
              overlayIds: layers.map((layer) => (layer as any).id),
            }
          : zone
      ),
    })

    applyBlurClips(canvas)
    saveHistoryState("Blur fade", { coalesceKey: `blur-feather:${id}` })
  },

  removeBlurZone: (id) => {
    const { canvas, blurZones, saveHistoryState } = get()
    if (!canvas) return

    const state = blurZones.find((zone) => zone.id === id)

    // Remove by the recorded list *and* by back-reference and id prefix. A
    // zone is several objects behind one control, and a half-removed zone left
    // orphaned overlays in the artwork with nothing in the panel to remove them.
    canvas
      .getObjects()
      .filter((object: any) => {
        if (object.id === id) return true
        if (state?.overlayIds?.includes(object.id)) return true
        if (object.overlayId === id) return true
        return (
          typeof object.id === "string" &&
          object.id.startsWith(`blur-overlay-${id}-`)
        )
      })
      .forEach((object) => canvas.remove(object))

    set({ blurZones: blurZones.filter((zone) => zone.id !== id) })
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    saveHistoryState("Remove blur zone")
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
    saveHistoryState("Add letterbox")
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
    saveHistoryState("Shadow gradient", { coalesceKey: "gradient" })
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
    saveHistoryState("Remove letterbox")
  },

  setGrainIntensity: (intensity) => {
    set({ grainIntensity: intensity })
    get().saveHistoryState("Film grain", { coalesceKey: "grain" })
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
    saveHistoryState("Adjust image", { coalesceKey: `filter:${type}` })
  },

  applyPreset: (matrix, coalesceKey) => {
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
    saveHistoryState("Colour grade", { coalesceKey })
  },

  /**
   * Warmth is a colour grade like any other, so it goes through `applyPreset`
   * and inherits its history handling — passing a coalesce key is what keeps a
   * slider drag to a single undo step instead of one per pixel of travel.
   */
  applyWarmth: (value) =>
    get().applyPreset(getWarmthMatrix(value), "filter:warmth"),

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
    get().applyPreset(getDuotoneMatrix(lightHex, darkHex, intensity), "duotone")
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
      get().applyImageFilter(which.charAt(0).toUpperCase() + which.slice(1), {
        [which]: value,
      })
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
