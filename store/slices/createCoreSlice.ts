import { CINEMATIC_PRESETS } from "@/lib/filters"
import {
  DOCUMENT_PROPERTIES,
  bindBlurHandleListeners,
  withoutEditorChrome,
} from "@/lib/fabricDocument"
import { getDesign, putDesign } from "@/lib/designs"
import { createAssetId, getAssetBlob, putAsset } from "@/lib/assets"
import { removeBackgroundInWorker } from "@/lib/backgroundRemoval"
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
import {
  importImage,
  pickImageFile,
  replaceImage,
  swapPhoto,
} from "@/lib/imageImport"
import { TEMPLATES } from "@/lib/templates"
import { CoreSlice, EditorStore } from "@/types/store.types"
import { ActiveSelection, Canvas, FabricImage, IText, Shadow } from "fabric"
import { StateCreator } from "zustand"

/**
 * Serialises the current document, without writing it anywhere.
 *
 * Shared by autosave and the design library so the two can never store
 * different shapes - a design opened later has to be understood by the same
 * loader. The selection is dropped for the length of the snapshot so the
 * children are serialised in absolute coordinates rather than the selection's
 * own space; the members are captured first, because Fabric empties an
 * `ActiveSelection` when it releases it.
 */
function capturePayload(get: () => EditorStore): ProjectPayload | null {
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
  if (!canvas) return null

  const selected = canvas.getActiveObjects()
  canvas.discardActiveObject()

  try {
    // Dehydrated: the photo's pixels live in IndexedDB under its asset id, so
    // what is stored is a few kilobytes of canvas JSON rather than an embedded
    // copy of a multi-megabyte photo.
    return {
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
  } catch (error) {
    console.error("Could not serialise the document:", error)
    return null
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

/** Serialises the document and writes it to a `localStorage` slot. */
function persistToSlot(
  get: () => EditorStore,
  key: string
): { ok: true; payload: ProjectPayload } | { ok: false } {
  const payload = capturePayload(get)
  if (!payload) return { ok: false }

  try {
    localStorage.setItem(key, JSON.stringify(payload))
    return { ok: true, payload }
  } catch (error) {
    console.error(`Failed to write ${key}:`, error)
    return { ok: false }
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
  lastSavedAt: null,
  backgroundRemoval: { status: "idle", progress: 0 },
  backgroundRemovalMode: "person",
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

  /** Serialises the document for callers that store it themselves. */
  captureDocument: () => capturePayload(get),

  /**
   * The autosave: writes the session slot, and keeps an open design current.
   *
   * Deliberately silent. It runs on a timer after every edit, so an error dialog
   * would appear unprompted and for a reason the user did not cause; a failure
   * here leaves `isDirty` true, which is the honest signal, and the next edit
   * tries again.
   *
   * When the canvas belongs to a saved design, the design record is updated
   * too - without a new thumbnail, which would mean rendering the artboard on
   * every autosave. The explicit Save refreshes that.
   */
  autosaveDocument: () => {
    const result = persistToSlot(get, DOCUMENT_KEY)
    if (!result.ok) return false
    set({ isDirty: false, savedSignature: signatureOf(result.payload) })

    const designId = get().currentDesignId
    if (designId) {
      void (async () => {
        try {
          const record = await getDesign(designId)
          if (!record) return
          await putDesign({
            ...record,
            payload: result.payload,
            artboard: result.payload.artboard,
            updatedAt: Date.now(),
          })
        } catch (error) {
          console.error("Could not update the open design:", error)
        }
      })()
    }
    return true
  },

  /**
   * Loads a payload that is already in memory.
   *
   * `announce` drives the restored-session notice: the automatic boot path says
   * so, while opening a design the user just picked does not - they know what
   * they did.
   */
  loadProjectPayload: async (data, options) => {
    const { canvas, setAspectRatio, saveHistoryState } = get()
    if (!canvas) return false

    await get().initializeCustomFonts()

    try {
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
      const missingAssets = await loadDocument(
        canvas,
        canvasJson as Record<string, unknown>
      )
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

      // The session slot is written from what is now on the canvas, and its
      // signature becomes the baseline. A loaded canvas does not necessarily
      // re-serialise byte-for-byte into the JSON it came from, so taking the
      // signature from the write is what makes "saved" mean saved.
      get().autosaveDocument()

      const announce = options?.announce ?? false
      const alreadyAnnounced =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(RESTORE_NOTICE_KEY) === "1"

      set({
        restoredAt:
          announce && !alreadyAnnounced ? (data.savedAt ?? null) : null,
      })
      if (
        announce &&
        !alreadyAnnounced &&
        typeof sessionStorage !== "undefined"
      ) {
        sessionStorage.setItem(RESTORE_NOTICE_KEY, "1")
      }
      return true
    } catch (error) {
      console.error("Failed to load the document:", error)
      return false
    }
  },

  /**
   * Restores the autosaved session.
   *
   * The document slot is what a reload should bring back. The legacy saved-copy
   * slot is only a fallback for a first run that predates the design library;
   * `initializeDesigns` migrates it and removes it.
   */
  loadProjectFromStorage: async () => {
    if (typeof window === "undefined") return false

    const raw =
      localStorage.getItem(DOCUMENT_KEY) ?? localStorage.getItem(STORAGE_KEY)
    if (!raw) return false

    try {
      return await get().loadProjectPayload(JSON.parse(raw), {
        announce: true,
      })
    } catch (error) {
      console.error("Failed to read the stored document:", error)
      return false
    }
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
    const {
      canvas,
      activeObject,
      beginHistoryTransaction,
      endHistoryTransaction,
    } = get()
    if (!canvas) return

    const file = await pickImageFile()
    if (!file) return

    // Replace the selected image when one is selected; otherwise the primary.
    const target =
      activeObject?.type === "image" ? (activeObject as FabricImage) : undefined

    beginHistoryTransaction("Replace image")
    try {
      const result = await replaceImage(canvas, file, { target })
      if (!result) return
      set({ imagePalette: result.palette })
      canvas.requestRenderAll()
    } catch (error) {
      console.error("Failed to replace image:", error)
    } finally {
      endHistoryTransaction()
    }
  },

  setBackgroundRemovalMode: (mode) => set({ backgroundRemovalMode: mode }),

  removeBackground: async (target, mode) => {
    const {
      canvas,
      activeObject,
      backgroundRemoval,
      backgroundRemovalMode,
      beginHistoryTransaction,
      endHistoryTransaction,
      saveHistoryState,
    } = get()
    if (!canvas) return false

    if (
      backgroundRemoval.status === "loading" ||
      backgroundRemoval.status === "processing"
    ) {
      return false
    }

    // The explicitly requested image wins, then the selection, then the primary
    // photo. The Media panel passes the primary so it keeps working when a text
    // layer happens to be selected; the inspector and context menu pass theirs.
    const photos = canvas
      .getObjects()
      .filter(
        (object) => object.type === "image" && !(object as any).isEffect
      ) as FabricImage[]

    const photo =
      (target?.type === "image" ? (target as FabricImage) : null) ??
      (activeObject?.type === "image" ? (activeObject as FabricImage) : null) ??
      photos[0]

    if (!photo) return false
    if ((photo as { locked?: boolean }).locked) return false

    // The pixels live in IndexedDB under the asset id; the live source is a
    // fallback for a document restored without one.
    const assetId = (photo as any).assetId as string | undefined
    let source = assetId ? await getAssetBlob(assetId) : null
    if (!source) {
      const src = photo.getSrc()
      if (src) {
        try {
          source = await fetch(src).then((response) => response.blob())
        } catch {
          source = null
        }
      }
    }
    if (!source) {
      set({
        backgroundRemoval: {
          status: "error",
          progress: 0,
          message: "The photo's pixels could not be read.",
        },
      })
      return false
    }

    set({ backgroundRemoval: { status: "loading", progress: 0 } })

    let cutout: Blob
    try {
      cutout = await removeBackgroundInWorker(
        source,
        mode ?? backgroundRemovalMode,
        (update) => set({ backgroundRemoval: { ...update } })
      )
    } catch (error) {
      console.error("Background removal failed:", error)
      set({
        backgroundRemoval: {
          status: "error",
          progress: 0,
          message:
            error instanceof Error
              ? error.message
              : "The background remover failed.",
        },
      })
      return false
    }

    try {
      // The selection can change while the model runs; never swap a photo that
      // has since been deleted.
      if (!canvas.getObjects().includes(photo)) {
        throw new Error("That photo was removed before the cutout was ready.")
      }

      const nextAssetId = createAssetId()
      await putAsset(nextAssetId, cutout)
      const next = await FabricImage.fromURL(URL.createObjectURL(cutout))

      // One history step: swapping the photo removes one object and inserts
      // another, and both fire the canvas's add/remove handlers.
      beginHistoryTransaction("Remove background")
      try {
        await swapPhoto(canvas, next, nextAssetId, {
          target: photo,
          // History still references the old bytes; deleting them would make
          // undo restore a photo that is no longer in the store.
          deletePrevious: false,
        })
        canvas.requestRenderAll()
        saveHistoryState()
      } finally {
        endHistoryTransaction()
      }

      // The palette describes the photograph, not its silhouette: sampling the
      // cutout would report transparent pixels and edge colours.
      set({ backgroundRemoval: { status: "done", progress: 100 } })
      return true
    } catch (error) {
      console.error("Could not apply the cutout:", error)
      set({
        backgroundRemoval: {
          status: "error",
          progress: 0,
          message:
            error instanceof Error
              ? error.message
              : "The cutout could not be applied.",
        },
      })
      return false
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

    // The session slot is overwritten with the empty document; saved designs
    // are a separate store and are untouched. `newDesign` detaches the canvas
    // from its current design before this runs, so the empty state cannot be
    // written back into the design it came from.
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
    // A template's grade is a composition-wide look, so it covers every image
    // layer - including a cutout placed above the background.
    if (fx.brightness !== undefined)
      store.applyImageFilter("Brightness", { brightness: fx.brightness }, "all")
    if (fx.contrast !== undefined)
      store.applyImageFilter("Contrast", { contrast: fx.contrast }, "all")
    if (fx.saturation !== undefined)
      store.applyImageFilter("Saturation", { saturation: fx.saturation }, "all")
    if (fx.warmth !== undefined) store.applyWarmth(fx.warmth, "all")
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
    const createdTexts: IText[] = []

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
      createdTexts.push(textObject)

      if (textRole === "quote") quoteObject = textObject
    })

    canvas.requestRenderAll()

    // Readability safeguard for every block, not only the quote. A template's
    // fill is chosen against a hypothetical image, so applying it over a real
    // photo can land exactly the unreadable result this app exists to prevent.
    // Each block is measured against its own background and only changed when
    // it fails, so a template that works keeps its art direction. The selection
    // is dropped first so its handles cannot tint the sample.
    canvas.discardActiveObject()
    createdTexts.forEach((text) => get().fitTextToBackground(text))
    // The transaction's snapshot was last taken when the texts were added; the
    // fitted colours are not in it until it is refreshed.
    get().saveHistoryState()

    if (quoteObject) {
      canvas.setActiveObject(quoteObject)
      get().setActiveObject(quoteObject)
      get().calculateContrast()
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
