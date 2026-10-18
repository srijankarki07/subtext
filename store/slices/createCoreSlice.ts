import { CINEMATIC_PRESETS } from "@/lib/filters"
import {
  DOCUMENT_PROPERTIES,
  bindBlurHandleListeners,
  withoutEditorChrome,
} from "@/lib/fabricDocument"
import { deleteAsset } from "@/lib/assets"
import { dehydrateCanvas, loadDocument } from "@/lib/snapshot"
import {
  DOCUMENT_KEY,
  RESTORE_NOTICE_KEY,
  STORAGE_KEY,
  signatureOf,
  type ProjectPayload,
} from "@/lib/persistence"
import { applyGrain } from "@/lib/grain"
import { applySelectionStyle } from "@/lib/selectionStyle"
import { importImage, pickImageFile, replaceImage } from "@/lib/imageImport"
import { TEMPLATES } from "@/lib/templates"
import { CoreSlice, EditorStore } from "@/types/store.types"
import { ActiveSelection, Canvas, IText, Shadow } from "fabric"
import { StateCreator } from "zustand"

/**
 * Serialises the current document and writes it to one of the two slots.
 *
 * Shared by Save and by autosave so the two can never drift into writing
 * different shapes - a slot read back by Restore has to be understood by both
 * paths. Returns the payload so the caller can record its signature.
 */
function persistToSlot(
  get: () => EditorStore,
  key: string
): { ok: true; payload: ProjectPayload } | { ok: false } {
  const {
    canvas,
    artboard,
    grainIntensity,
    gradientOpacity,
    vignettes,
    blurZones,
    letterboxes,
    imagePalette,
    documentTitle,
  } = get()
  if (!canvas) return { ok: false }

  // Deselected for the length of the write so the children are serialised in
  // absolute coordinates rather than the selection's own space.
  //
  // The members are captured first, because Fabric empties an `ActiveSelection`
  // when it releases it - putting the same instance back would select nothing.
  const selected = canvas.getActiveObjects()
  canvas.discardActiveObject()

  try {
    // Dehydrated: the photo's pixels live in IndexedDB under its asset id, so
    // what goes to localStorage is a few kilobytes of canvas JSON rather than
    // an embedded copy of a multi-megabyte photo - which is what made saving a
    // real photo fail on the storage quota.
    const payload: ProjectPayload = {
      canvasJson: dehydrateCanvas(canvas),
      artboard,
      grainIntensity,
      gradientOpacity,
      vignettes,
      blurZones,
      letterboxes,
      imagePalette,
      documentTitle,
      savedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }

    localStorage.setItem(key, JSON.stringify(payload))
    return { ok: true, payload }
  } catch (error) {
    console.error(`Failed to write ${key}:`, error)
    return { ok: false }
  } finally {
    if (selected.length === 1) {
      canvas.setActiveObject(selected[0])
    } else if (selected.length > 1) {
      canvas.setActiveObject(new ActiveSelection(selected, { canvas } as never))
    }
    if (selected.length > 0) {
      canvas.requestRenderAll()
      /*
       * Put the selection back in the store as well as on the canvas.
       *
       * The discard above fires `selection:cleared`, and the canvas's own
       * handler empties `selectedObjects`. Restoring only the canvas left the
       * floating toolbar and the inspector believing nothing was selected, so
       * a selection silently vanished a couple of seconds after any edit -
       * exactly when autosave ran. It made align-then-distribute impossible:
       * the first action cleared the toolbar the second one needed.
       */
      get().setSelection(canvas.getActiveObjects())
    }
  }
}

/**
 * Zoom limits. Below the minimum the artboard is unreachable; above the
 * maximum it is a blurry upscale with no extra detail to show.
 */
export const MIN_ZOOM = 0.05
export const MAX_ZOOM = 3

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

/**
 * Applies the artboard's on-screen scale.
 *
 * This is a CSS-only resize: the Fabric backstore keeps the artboard's logical
 * size, so object coordinates, hit testing and `toDataURL` all stay in document
 * units. `setDimensions(..., { cssOnly: true })` sizes the visible canvas, the
 * selection canvas and the `.canvas-container` together, which is what lets the
 * workspace scroll a zoomed-in artboard.
 */
function applyCanvasZoom(
  canvas: Canvas | null,
  artboard: { width: number; height: number },
  zoom: number
) {
  if (!canvas) return
  canvas.setDimensions(
    {
      width: `${Math.round(artboard.width * zoom)}px`,
      height: `${Math.round(artboard.height * zoom)}px`,
    },
    { cssOnly: true }
  )
  // Handle sizes are in canvas units, so they have to be restated whenever the
  // scale changes or they grow and shrink with it.
  applySelectionStyle(canvas, zoom)
}

/** The largest scale at which the whole artboard fits the available space. */
function fitScale(
  viewport: { width: number; height: number },
  artboard: { width: number; height: number }
) {
  if (viewport.width <= 0 || viewport.height <= 0) return 1
  return clampZoom(
    Math.min(viewport.width / artboard.width, viewport.height / artboard.height)
  )
}

export const createCoreSlice: StateCreator<EditorStore, [], [], CoreSlice> = (
  set,
  get
) => ({
  canvas: null,
  activeObject: null,
  selectedObjects: [],
  activeMobileTab: null,
  artboard: { width: 1080, height: 1080 },
  isExportModalOpen: false,
  confirmDialog: null,
  alertDialog: null,
  setConfirmDialog: (config) => set({ confirmDialog: config }),
  setAlertDialog: (config) => set({ alertDialog: config }),
  hasSavedProject: false,
  lastSavedAt: null,
  clipboardObject: null,
  documentTitle: "Untitled",
  isDirty: false,
  savedSignature: null,
  restoredAt: null,
  zoom: 1,
  isFit: true,
  viewport: { width: 0, height: 0 },
  // Off by default: guides are a tool you reach for, and a grid drawn over the
  // artwork on first open would read as part of the design. Snapping, which is
  // the half that does real work, is always on.
  guides: { thirds: false, centre: false, safeArea: false },
  activeGuides: [],
  isComparing: false,

  /**
   * Registers the Fabric canvas and immediately applies the current view scale.
   *
   * The scale has to be applied here as well as on viewport change. The
   * workspace measures itself and fits on mount, but `next/dynamic` (ssr:false)
   * mounts the Fabric canvas *after* that, so the fit ran while `canvas` was
   * still null and the artboard was left rendering at 100% - overflowing the
   * whole workspace. Besides looking wrong, that made the empty-state overlay
   * cover everything, so a click anywhere opened the file picker.
   */
  setCanvas: (canvas) => {
    set({ canvas })

    const { artboard, zoom, isFit } = get()
    if (isFit) {
      get().fitToViewport()
    } else {
      applyCanvasZoom(canvas, artboard, zoom)
      canvas.requestRenderAll()
    }

    get().checkSavedProject()
  },

  /**
   * Renaming is a change to the document, not to the chrome.
   *
   * The name is what a downloaded file is called, so losing it on reload is
   * losing work. It commits history - coalesced, so a typed name is one undo
   * step rather than one per keystroke - which is also what makes the rename
   * reachable by the dirty check and therefore by autosave.
   */
  setDocumentTitle: (documentTitle) => {
    set({ documentTitle })
    get().saveHistoryState("Rename", { coalesceKey: "document-title" })
  },

  acknowledgeRestore: () => set({ restoredAt: null }),

  /**
   * Called by the workspace's ResizeObserver. While the view is in fit mode
   * this re-fits, which is what keeps the artboard correctly sized when a panel
   * opens, the window resizes or the inspector is toggled.
   */
  setViewport: (width, height) => {
    const { viewport, isFit } = get()
    if (viewport.width === width && viewport.height === height) return

    set({ viewport: { width, height } })
    if (isFit) get().fitToViewport()
  },

  setZoom: (zoom) => {
    const { canvas, artboard } = get()
    const next = clampZoom(zoom)
    set({ zoom: next, isFit: false })
    applyCanvasZoom(canvas, artboard, next)
    canvas?.requestRenderAll()
  },

  zoomBy: (factor) => {
    get().setZoom(get().zoom * factor)
  },

  fitToViewport: () => {
    const { canvas, artboard, viewport } = get()
    const scale = fitScale(viewport, artboard)
    set({ zoom: scale, isFit: true })
    applyCanvasZoom(canvas, artboard, scale)
    canvas?.requestRenderAll()
  },

  checkSavedProject: () => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem(STORAGE_KEY)
    set({ hasSavedProject: !!saved })
  },

  saveProjectToStorage: () => {
    const result = persistToSlot(get, STORAGE_KEY)
    // Autosave would otherwise write the discarded document straight back.
    // Failing to write the document slot is not worth an error dialog: the
    // saved copy is the one the user asked for, and that write is what the
    // dialog below reports.
    if (result.ok) persistToSlot(get, DOCUMENT_KEY)

    if (!result.ok) {
      // Was a raw window.alert(), a third dialog implementation appearing in
      // browser chrome while the styled alert dialog existed right here.
      set({
        alertDialog: {
          title: "Could not save",
          message:
            "This project is too large for browser storage. Try a smaller image, then save again.",
        },
      })
      return false
    }

    set({
      hasSavedProject: true,
      lastSavedAt: result.payload.savedAt,
      isDirty: false,
      // Recorded so the *next* comparison has something to compare against.
      // Without it, "is this saved?" could only ever be answered by the act of
      // saving, which is exactly why the badge used to lie after an undo.
      savedSignature: signatureOf(result.payload),
    })
    return true
  },

  /**
   * The autosave: writes the *document* slot, and nothing else.
   *
   * Deliberately silent. It runs on a timer after every edit, so an error dialog
   * would appear unprompted and for a reason the user did not cause; a failure
   * here leaves `isDirty` true, which is the honest signal, and the next edit
   * tries again.
   */
  autosaveDocument: () => {
    const result = persistToSlot(get, DOCUMENT_KEY)
    if (!result.ok) return false
    // Marked clean against the document slot, which is what "Saved" means: the
    // work is written and will come back. Whether there is also an explicit copy
    // is a separate question, answered by the Save button.
    set({ isDirty: false, savedSignature: signatureOf(result.payload) })
    return true
  },

  /**
   * Loads a stored document.
   *
   * Defaults to the autosaved document slot, which is what a reload should bring
   * back; the Restore button asks for the saved copy explicitly. The fallback
   * matters for anyone who used the app before the two slots existed: their only
   * copy is in the saved-project slot, and it should still be restored.
   */
  loadProjectFromStorage: async (source = "document") => {
    const { canvas, setAspectRatio, saveHistoryState } = get()
    if (!canvas || typeof window === "undefined") return false

    await get().initializeCustomFonts()

    const key = source === "savedProject" ? STORAGE_KEY : DOCUMENT_KEY
    const raw =
      localStorage.getItem(key) ??
      (source === "document" ? localStorage.getItem(STORAGE_KEY) : null)
    if (!raw) return false

    try {
      const data = JSON.parse(raw)
      const {
        canvasJson,
        artboard,
        grainIntensity,
        gradientOpacity,
        vignettes,
        blurZones,
        letterboxes,
        imagePalette,
        documentTitle,
      } = data

      // 1. Restore Artboard & CSS scaling
      if (artboard?.width && artboard?.height) {
        setAspectRatio(artboard.width, artboard.height)
      }

      // 2. Restore Effect Slice States
      set({
        grainIntensity: grainIntensity ?? 0,
        gradientOpacity: gradientOpacity ?? 0,
        vignettes: vignettes ?? [],
        blurZones: blurZones ?? [],
        letterboxes: letterboxes ?? [],
        imagePalette: imagePalette ?? [],
        documentTitle: documentTitle ?? "Untitled",
      })

      // 3. Load Canvas Objects, restoring the photo from its stored asset first
      const missingAssets = await loadDocument(canvas, canvasJson)
      if (missingAssets > 0) {
        set({
          alertDialog: {
            title: "Photo missing",
            message:
              "This project referenced a photo that is no longer in browser storage, so it could not be restored. The rest of the layout is intact.",
          },
        })
      }

      // 4. Re-bind draggable event listeners for any blur handles
      bindBlurHandleListeners(canvas)

      canvas.requestRenderAll()
      saveHistoryState()
      const alreadyAnnounced =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(RESTORE_NOTICE_KEY) === "1"

      // The document slot is written from what is now on the canvas, and its
      // signature becomes the baseline.
      //
      // Two things this gets right that a hand-built signature did not. The
      // commit above ran against whatever baseline was in force *before* the
      // load - `null` on a fresh boot - so it left the freshly restored document
      // reading as dirty. And after a Restore, the two slots must agree with
      // what is on screen: without this, reloading straight after a Restore
      // would bring back the document that was there before it.
      //
      // It also sidesteps a subtlety: a loaded canvas does not necessarily
      // re-serialise byte-for-byte into the JSON it came from, so a signature
      // assembled from the *stored* JSON could disagree with the signature of
      // the canvas as it now stands. Taking the signature from the write makes
      // the two the same by construction.
      get().autosaveDocument()

      // Drives the notice: the user is told their session came back rather than
      // finding someone else's document on their canvas. Only for the automatic
      // path - announcing a restore the user just asked for would be telling
      // them what they did - and only once per tab session, after which it is
      // nagging on every reload.
      set({
        restoredAt:
          source === "document" && !alreadyAnnounced
            ? (data.savedAt ?? null)
            : null,
      })
      if (
        source === "document" &&
        !alreadyAnnounced &&
        typeof sessionStorage !== "undefined"
      ) {
        sessionStorage.setItem(RESTORE_NOTICE_KEY, "1")
      }
      return true
    } catch (error) {
      console.error("Failed to load project from localStorage:", error)
      return false
    }
  },

  clearSavedProject: () => {
    if (typeof window === "undefined") return

    // Read the payload first: deleting the project should delete the photos it
    // stored, or they sit in IndexedDB for good with nothing referencing them.
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const assets: string[] = raw
        ? (JSON.parse(raw).canvasJson?.objects ?? [])
            .map((object: any) => object.assetId)
            .filter((id: unknown): id is string => typeof id === "string")
        : []
      assets.forEach((id) => void deleteAsset(id))
    } catch (error) {
      console.error("Could not read the saved project's assets:", error)
    }

    localStorage.removeItem(STORAGE_KEY)
    set({ hasSavedProject: false, lastSavedAt: null })
  },

  setActiveObject: (activeObject) => {
    set({ activeObject, selectedObjects: activeObject ? [activeObject] : [] })
    // Recalculate text-to-background contrast whenever a new object is selected
    get().calculateContrast()
  },

  /**
   * Records a whole selection in one write.
   *
   * The count is kept alongside the first object because the two answer
   * different questions - what to describe, and how many things the user
   * thinks they have hold of.
   */
  setSelection: (objects) => {
    set({
      activeObject: objects[0] ?? null,
      selectedObjects: objects,
    })
    get().calculateContrast()
  },

  setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),

  toggleGuide: (key) =>
    set((state) => ({
      guides: { ...state.guides, [key]: !state.guides[key] },
    })),

  setActiveGuides: (activeGuides) => set({ activeGuides }),

  setComparing: (isComparing) => set({ isComparing }),
  setIsExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setAspectRatio: (width, height) => {
    const { canvas, saveHistoryState, isFit, zoom } = get()
    if (!canvas) return

    set({ artboard: { width, height } })

    // 1. Synchronize logical canvas coordinate dimensions. This is the document
    //    size - the thing that gets exported - and is independent of zoom.
    canvas.setDimensions({ width, height })

    // 2. Re-fit, or re-apply the user's zoom to the new aspect. The old code
    //    computed a scale once here and never revisited it, so opening a panel
    //    or resizing the window left the artboard at a stale size.
    if (isFit) {
      get().fitToViewport()
    } else {
      applyCanvasZoom(canvas, { width, height }, zoom)
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

  addImage: async () => {
    const { canvas, beginHistoryTransaction, endHistoryTransaction } = get()
    if (!canvas) return

    const file = await pickImageFile()
    if (!file) return

    // Transactional because `importImage` inserts the photo, which fires the
    // canvas's `object:added` handler and records an entry - and the palette is
    // only written to the store *after* that, so the two snapshots differ and
    // the dedupe keeps both. The photo cost two history steps and the first
    // press of undo appeared to do nothing.
    beginHistoryTransaction("Upload image")
    try {
      const result = await importImage(canvas, file)
      if (!result) return
      // This path used to skip palette extraction entirely, so the colour panel
      // claimed there was no image to sample straight after one was added.
      set({ imagePalette: result.palette })
      canvas.requestRenderAll()
    } catch (error) {
      console.error("Failed to load image:", error)
    } finally {
      endHistoryTransaction()
    }
  },

  replaceImage: async () => {
    const { canvas, beginHistoryTransaction, endHistoryTransaction } = get()
    if (!canvas) return

    const file = await pickImageFile()
    if (!file) return

    beginHistoryTransaction("Replace image")
    try {
      const result = await replaceImage(canvas, file)
      if (!result) return
      set({ imagePalette: result.palette })
      canvas.requestRenderAll()
    } catch (error) {
      console.error("Failed to replace image:", error)
    } finally {
      endHistoryTransaction()
    }
  },

  deleteActiveObject: (targetObj) => {
    const {
      canvas,
      activeObject,
      beginHistoryTransaction,
      endHistoryTransaction,
      closeContextMenu,
      removeBlurZone,
    } = get()
    if (!canvas) return

    /**
     * The canvas is the authority on what is selected.
     *
     * This used to delete `activeObject`, which is only the *first* member of a
     * multi-selection - so holding shift, selecting three layers and pressing
     * Delete removed one and silently discarded the rest. Measured: two objects
     * selected, one layer left behind.
     */
    const selection = canvas.getActiveObjects()
    const requested = targetObj
      ? [targetObj]
      : selection.length
        ? selection
        : activeObject
          ? [activeObject]
          : []

    // Locked objects are skipped rather than blocking the whole delete, so a
    // locked letterbox bar in a group of three does not make the other two
    // undeletable.
    const targets = requested.filter(
      (object) => !(object as { locked?: boolean }).locked
    )
    if (!targets.length) return

    beginHistoryTransaction(
      targets.length > 1 ? "Delete layers" : "Delete layer"
    )

    try {
      // A blur zone is several canvas objects behind one control. Deleting any
      // part of it has to take the whole zone: removing one overlay left the
      // handle and the remaining layers behind with nothing to remove them by.
      const zoneIds = new Set<string>()
      const plain: typeof targets = []

      targets.forEach((object) => {
        const id = (object as any).id as string | undefined
        const zoneId = id?.startsWith("blur-handle-")
          ? id
          : id?.startsWith("blur-overlay-")
            ? ((object as any).overlayId as string | undefined)
            : undefined
        if (zoneId) zoneIds.add(zoneId)
        else plain.push(object)
      })

      zoneIds.forEach((zoneId) => removeBlurZone(zoneId))
      if (plain.length) canvas.remove(...plain)

      canvas.discardActiveObject()
      canvas.requestRenderAll()

      set({ activeObject: null, selectedObjects: [], visibility: null })
      closeContextMenu()
    } finally {
      endHistoryTransaction()
    }
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
        textStr = "- Albert Camus"
        Object.assign(options, {
          fontFamily: "Montserrat",
          fontSize: 24,
          fontStyle: "italic",
          opacity: 0.8,
        })
        break
      case "handle":
        textStr = "@Subtext"
        Object.assign(options, {
          fontFamily: "Inter",
          fontSize: 16,
          charSpacing: 200,
          opacity: 0.6,
        })
        break
      case "signature":
        textStr = "Your Name"
        Object.assign(options, {
          // A script face is what makes a signature read as one rather than as
          // another line of type. No shadow: script at this weight smears.
          fontFamily: "Great Vibes",
          fontSize: 44,
          shadow: undefined,
        })
        break
    }

    // A signature belongs in the lower third, where a signature goes. Everything
    // else starts centred, which is a neutral place to move from.
    const verticalPosition =
      type === "signature" ? canvas.getHeight() * 0.78 : canvas.getHeight() / 2

    const textObject = new IText(textStr, {
      ...options,
      left: canvas.getWidth() / 2,
      top: verticalPosition,
    })

    // Stamp the block's role. Templates already did this; blocks added from the
    // Text panel did not, so nothing downstream could tell a quote from a
    // signature - the inspector could only call them all "Text layer", and the
    // role was not written to the saved document either.
    ;(textObject as any).textType = type

    canvas.add(textObject)
    canvas.setActiveObject(textObject)
    canvas.requestRenderAll()
    saveHistoryState()
  },

  /**
   * Starts a new document: clears the artboard and resets everything that
   * describes it, but keeps the Fabric canvas alive.
   *
   * The previous implementation called `canvas.dispose()` and set `canvas:
   * null`, which permanently killed the editor - the Canvas component only
   * constructs the Fabric canvas on mount, so nothing would ever rebuild it.
   * That is presumably why this was never wired to any UI.
   */
  clearCanvas: () => {
    const { canvas } = get()
    if (!canvas) return

    canvas.discardActiveObject()
    canvas.remove(...canvas.getObjects())

    set({
      activeObject: null,
      selectedObjects: [],
      visibility: null,
      imagePalette: [],
      vignettes: [],
      blurZones: [],
      letterboxes: [],
      grainIntensity: 0,
      gradientOpacity: 0,
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,
      documentTitle: "Untitled",
      // The notice refers to a session that no longer exists.
      restoredAt: null,
    })

    canvas.requestRenderAll()
    get().saveHistoryState("New canvas")

    // The document slot is overwritten with the empty document, and the saved
    // copy is left alone.
    //
    // That distinction is the dialog's promise - clearing the artboard must not
    // delete the copy the user asked for, so Restore can still bring it back.
    // Overwriting rather than removing is what stops a reload resurrecting the
    // discarded document *and* keeps the saved copy out of reach of the boot
    // fallback, which exists only for a first-ever session that has nothing but
    // a saved copy.
    //
    // Last, so autosave cannot write the discarded document on its way out.
    get().autosaveDocument()
  },

  // TEMPLATE INJECTION
  applyTemplate: (templateId) => {
    const store = get() as EditorStore // Access full combined store context
    const { canvas, beginHistoryTransaction, endHistoryTransaction } = store
    if (!canvas) return

    // One template application is one undo step, not fifteen: it sets fonts,
    // positions, grade, grain, vignette and letterbox in separate calls, and
    // every one of them used to record its own entry. Opened *after* the guard
    // so that an early return cannot leave a transaction dangling - a dangling
    // transaction swallows every later snapshot and history stops recording.
    beginHistoryTransaction("Apply template")

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
    let quoteObject: IText | null = null

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
              ? "- ALBERT CAMUS"
              : "@Subtext"
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

      if (textRole === "quote") quoteObject = textObject
    })

    canvas.requestRenderAll()

    // Readability safeguard. A template's fill is chosen against a hypothetical
    // image, so applying it over a real photo could land exactly the unreadable
    // result this app exists to prevent. The colour is only overridden when it
    // actually fails, so a template that works keeps its art direction.
    if (quoteObject) {
      canvas.setActiveObject(quoteObject)
      get().setActiveObject(quoteObject)
      get().calculateContrast()

      if (get().visibility?.badge === "FAIL") {
        get().autoColorText()
      }
    }

    endHistoryTransaction()
  },

  copyCanvasToClipboard: async (scale = 1) => {
    const { canvas } = get()
    if (!canvas) return false

    // 1. Temporarily deselect active objects so bounding boxes aren't captured
    const activeObj = canvas.getActiveObject()
    canvas.discardActiveObject()
    canvas.requestRenderAll()

    try {
      // 2. toCanvasElement takes 'multiplier' directly as a number in Fabric.
      //    Editor-only objects are hidden for the render, and grain is
      //    composited here too, or the clipboard copy would be the one output
      //    that silently differs from the screen.
      const grainIntensity = get().grainIntensity
      const tempCanvas = withoutEditorChrome(canvas, () => {
        const element = canvas.toCanvasElement(scale)
        applyGrain(element, grainIntensity, { scale })
        return element
      })

      // 3. Convert to PNG Blob via HTMLCanvasElement.toBlob
      let blob = await new Promise<Blob | null>((resolve) => {
        tempCanvas.toBlob((b) => resolve(b), "image/png")
      })

      // Reliable fallback if toBlob returned null
      if (!blob) {
        const dataUrl = canvas.toDataURL({
          format: "png",
          multiplier: scale,
        })
        const res = await fetch(dataUrl)
        blob = await res.blob()
      }

      if (!blob) throw new Error("Failed to create blob from canvas")

      // 4. Write to Clipboard using standard ClipboardItem API
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error(
          "Clipboard API not supported in this browser environment"
        )
      }

      const item = new ClipboardItem({ "image/png": blob })
      await navigator.clipboard.write([item])

      return true
    } catch (err) {
      console.error("Clipboard copy error:", err)
      return false
    } finally {
      // Restore selection
      if (activeObj) {
        canvas.setActiveObject(activeObj)
        canvas.requestRenderAll()
      }
    }
  },

  // ELEMENT CLIPBOARD
  copyActiveObject: async () => {
    const { activeObject } = get()
    if (!activeObject || (activeObject as { locked?: boolean }).locked) return

    // Clone the active element and keep an in-memory reference
    const cloned = await activeObject.clone(
      DOCUMENT_PROPERTIES as unknown as string[]
    )
    set({ clipboardObject: cloned })
  },

  cutActiveObject: async () => {
    const { activeObject, copyActiveObject, deleteActiveObject } = get()
    if (!activeObject || (activeObject as { locked?: boolean }).locked) return

    await copyActiveObject()
    deleteActiveObject(activeObject)
  },

  pasteClipboardObject: async () => {
    const { canvas, clipboardObject, saveHistoryState } = get()
    if (!canvas || !clipboardObject) return

    // Clone the clipboard copy so multiple pastes create independent objects
    const cloned = await clipboardObject.clone(
      DOCUMENT_PROPERTIES as unknown as string[]
    )
    canvas.discardActiveObject()

    cloned.set({
      left: (cloned.left || 0) + 20,
      top: (cloned.top || 0) + 20,
      evented: true,
    })

    // Advance original clipboard coordinates so subsequent pastes cascade diagonally
    clipboardObject.set({
      left: (clipboardObject.left || 0) + 20,
      top: (clipboardObject.top || 0) + 20,
    })

    canvas.add(cloned)
    canvas.setActiveObject(cloned)
    canvas.requestRenderAll()

    set({ activeObject: cloned })
    saveHistoryState()
  },
})
