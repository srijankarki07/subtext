import { Canvas, FabricObject, IText } from "fabric"

import type { AlignMode, DistributeAxis } from "@/lib/arrange"
import type { BackgroundRemovalMode } from "@/lib/backgroundRemoval"
import type { DesignSummary } from "@/lib/designs"
import type { ProjectPayload } from "@/lib/persistence"
import type { SnapLine } from "@/lib/composition"
import type { EffectSnapshot } from "@/lib/snapshot"
import type { VisibilityReport } from "@/lib/visibility"
import { CustomFontMetadata } from "@/lib/customFonts"

export type TextBlockType = "quote" | "author" | "handle" | "signature"

/** Which composition guides are drawn over the artboard. */
export interface GuidesState {
  thirds: boolean
  centre: boolean
  safeArea: boolean
}
export type MobileTab = "templates" | "layers" | "edit" | "export" | null

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetObject: FabricObject | null
}

export interface FontSlice {
  customFonts: CustomFontMetadata[]
  customFontsLoading: boolean
  customFontError: string | null
  initializeCustomFonts: () => Promise<void>
  uploadCustomFont: (file: File) => Promise<boolean>
  removeCustomFont: (id: string) => Promise<boolean>
}

/**
 * HISTORY SLICE: Manages the undo/redo stack using JSON snapshots of the canvas.
 */

export interface HistoryItem {
  id: string
  json: string
  title: string
  timestamp: string
  objectCount: number
  /**
   * Grading and overlay state, which lives in the store rather than in the
   * Fabric object graph and so is not in `json`.
   */
  effects: EffectSnapshot
  /**
   * Identifies the control that produced this entry, so repeated edits of the
   * same control collapse into it instead of filling the stack.
   */
  coalesceKey?: string
}
export interface HistorySlice {
  history: HistoryItem[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
  isHistoryProcessing: boolean

  saveHistoryState: (
    description?: string,
    options?: { coalesceKey?: string }
  ) => void
  /**
   * Groups a compound edit into one history entry. Anything saved between the
   * calls is folded into the entry committed at the end.
   */
  beginHistoryTransaction: (description: string) => void
  endHistoryTransaction: () => void
  undo: () => Promise<void>
  redo: () => Promise<void>
  jumpToHistoryIndex: (index: number) => Promise<void>
}

/**
 * CONTEXT MENU SLICE: Manages the visibility and coordinates of the right-click menu.
 */
export interface ContextMenuSlice {
  contextMenu: ContextMenuState
  openContextMenu: (x: number, y: number, obj: FabricObject | null) => void
  closeContextMenu: () => void
  duplicateActiveObject: () => void
}

/**
 * LAYER SLICE: Handles depth sorting (z-index), alignments, locking, and scaling to fit.
 */
export interface LayerSlice {
  bringToFront: () => void
  bringForward: () => void
  sendBackward: () => void
  sendToBack: () => void
  moveLayerToIndex: (oldIndex: number, newIndex: number) => void
  toggleLayerLock: (obj?: FabricObject | null) => void
  toggleLayerVisibility: (obj?: FabricObject | null) => void
  alignObjectToCanvas: (
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => void
  /**
   * Aligns the selected layers to the selection's own bounds.
   *
   * Two or more layers; a single layer has no selection to align against - that
   * case is `alignObjectToCanvas`, which aligns to the artboard.
   */
  alignSelection: (alignment: AlignMode) => void
  /**
   * Spaces the selected layers evenly between the outermost two.
   *
   * Three or more; with two there is no interior to distribute.
   */
  distributeSelection: (axis: DistributeAxis) => void
  /**
   * Moves the selection by a small delta, for arrow-key nudging.
   *
   * Repeated calls coalesce into one history entry, so holding an arrow key is
   * one undo step rather than fifty.
   */
  nudgeSelection: (dx: number, dy: number) => void
  fitImageToCanvas: (mode: "fit" | "fill") => void
}

/**
 * COLOR SLICE: Handles typographic styling, background pixel sampling for contrast checking,
 * and the custom eyedropper tool.
 */
export interface ColorSlice {
  imagePalette: string[]
  /**
   * The readability report for the selected text: contrast against the worst
   * part of the background it sits on, plus what the text's own outline and
   * shadow contribute. Null when nothing textual is selected.
   */
  visibility: VisibilityReport | null
  isPickingColor: boolean
  colorPickerTarget: "fill" | "stroke" | "shadow" | "background" | null
  pickerSnapshot: HTMLCanvasElement | null
  colorPickerActiveObject: FabricObject | null

  getCanvasColor: (x: number, y: number) => string | null
  setImagePalette: (colors: string[]) => void
  /** Recomputes the visibility report. `quality` trades speed for precision. */
  calculateContrast: (quality?: "fast" | "full") => void
  /** Frame-throttled `calculateContrast`, for use while dragging. */
  scheduleContrast: (quality?: "fast" | "full") => void
  autoColorText: () => void
  startColorPicker: (
    target: "fill" | "stroke" | "shadow" | "background"
  ) => void
  stopColorPicker: () => void
  sampleCanvasColor: (x: number, y: number) => void
  pickColor: (
    target: "fill" | "stroke" | "shadow" | "background"
  ) => Promise<void>
  applyTextStyle: (key: string, value: any) => void
  /**
   * Makes one block readable against its own background.
   *
   * By default only a failing block is changed; `force` is the Smart
   * auto-colour button, which always chooses the best candidate. `save` records
   * a history entry for callers outside a transaction.
   */
  fitTextToBackground: (
    text: IText,
    options?: { force?: boolean; save?: boolean }
  ) => VisibilityReport | null
  /** Applies a named style to the selected block in one step. */
  applyTextPreset: (id: string) => void
  getActiveSelectionStyle: (key: string) => any
}

/**
 * EFFECT SLICE: Manages image grading, overlays and the multi-instance effect layers
 * (vignettes, blur zones, letterbox bars) that sit on top of the artwork.
 */
export interface VignetteState {
  id: string
  opacity: number
  type: "radial" | "linear"
  color: string
}

export interface BlurZoneState {
  id: string
  /** The stacked blurred copies: index 0 is the core, the rest are the fade. */
  overlayIds: string[]
  /** Blur radius, 0–100. */
  blur: number
  /** How far the blur fades out beyond the core, 0–100. Zero is a hard edge. */
  feather: number
}

export interface LetterboxState {
  id: string
  topId: string
  bottomId: string
}

export interface EffectSlice {
  grainIntensity: number
  gradientOpacity: number

  /*
   * Duotone lives here rather than in the panel's own state. It was local, so
   * leaving the Cinema tool reset the controls while the image kept its grade -
   * the sliders then disagreed with the artwork, and the next nudge applied a
   * delta from a stale base.
   */
  duotoneLight: string
  duotoneDark: string
  duotoneIntensity: number
  setDuotoneColour: (which: "light" | "dark", hex: string) => void
  setDuotoneIntensity: (intensity: number) => void

  /* Image adjustments, for the same reason as the duotone settings above. */
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  setAdjustment: (
    which: "brightness" | "contrast" | "saturation" | "warmth",
    value: number
  ) => void

  // Arrays to hold multiple independent effect layers
  vignettes: VignetteState[]
  blurZones: BlurZoneState[]
  letterboxes: LetterboxState[]

  setGrainIntensity: (intensity: number) => void
  setGradientOverlay: (
    opacity: number,
    type: "linear" | "radial",
    color1: string,
    color2: string
  ) => void

  applyImageFilter: (type: string, options: any) => void
  applyPreset: (matrix: number[], coalesceKey?: string) => void
  applyWarmth: (value: number) => void
  applyDuotone: (lightHex: string, darkHex: string, intensity?: number) => void
  resetEffect: (
    category: "adjustments" | "cinematic" | "atmospherics" | "all"
  ) => void

  // Multi-instance Generators
  addVignette: (initialConfig?: Partial<VignetteState>) => void
  updateVignette: (id: string, updates: Partial<VignetteState>) => void
  removeVignette: (id: string) => void

  addBlurZone: () => Promise<void>
  /** Builds the blurred layers for a zone, one per fade ring. */
  buildBlurLayers: (
    handleId: string,
    feather: number
  ) => Promise<FabricObject[]>
  updateBlurZone: (id: string, blur: number) => void
  setBlurZoneFeather: (id: string, feather: number) => Promise<void>
  removeBlurZone: (id: string) => void

  addLetterbox: (thicknessRatio: number) => void
  removeLetterbox: (id: string) => void
}

/**
 * CORE SLICE: Manages the canvas initialization, global selections,
 * artboard dimensions, and adding/removing base objects.
 */

export interface DialogConfig {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  onClose?: () => void
}

export interface CoreSlice {
  confirmDialog: DialogConfig | null
  alertDialog: DialogConfig | null
  setConfirmDialog: (config: DialogConfig | null) => void
  setAlertDialog: (config: DialogConfig | null) => void

  canvas: Canvas | null
  activeObject: FabricObject | null
  /**
   * Everything currently selected, in Fabric's order.
   *
   * `activeObject` is only the first of them, so on its own it could not tell
   * the inspector that three layers are selected - the panel described one
   * object while the artboard showed a group, and Delete removed one object and
   * discarded the rest.
   */
  selectedObjects: FabricObject[]
  activeMobileTab: MobileTab
  artboard: { width: number; height: number }
  isExportModalOpen: boolean
  lastSavedAt: string | null
  backgroundRemoval: BackgroundRemovalState
  backgroundRemovalMode: BackgroundRemovalMode
  clipboardObject: FabricObject | null

  /** The workspace name. Persisted with the project and used for export filenames. */
  documentTitle: string
  /**
   * True when the document differs from the autosaved copy - that is, there are
   * changes not yet written. Drives autosave and the status badge, and means
   * "would I lose work?", not "have I pressed Save?".
   */
  isDirty: boolean
  /**
   * The signature of the stored document, or null if nothing is stored.
   *
   * Internal: it exists so `isDirty` can be a comparison rather than a guess.
   * See `lib/persistence.ts`.
   */
  savedSignature: string | null
  /** Set when a document was restored on load, to drive the notice. Cleared on acknowledgement. */
  restoredAt: string | null

  /**
   * The artboard's on-screen scale. 1 means the artboard is displayed at its
   * logical size. Applied as a CSS size on the Fabric canvas, so logical
   * coordinates and export are unaffected.
   */
  zoom: number
  /** True while `zoom` is derived from the available space rather than the user. */
  isFit: boolean
  /** Last measured size of the scrollable workspace, used to compute fit. */
  viewport: { width: number; height: number }

  /** Which composition guides are drawn. Snapping is independent of this. */
  guides: GuidesState
  /**
   * Whether the before/after split is showing.
   *
   * In the store rather than in the shell because the overlay lives down in the
   * canvas and the controls that toggle it live up in the chrome; putting it
   * here is what lets both reach it, and lets the command palette offer it.
   */
  isComparing: boolean
  /**
   * The guides that fired under the object being dragged right now.
   *
   * Transient: set while the pointer is down and cleared on release. It is not
   * part of the document, so it is not snapshot, saved, or undone.
   */
  activeGuides: SnapLine[]

  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  /** Records a whole selection; the first object becomes `activeObject`. */
  setSelection: (objects: FabricObject[]) => void
  toggleGuide: (key: keyof GuidesState) => void
  setComparing: (comparing: boolean) => void
  setActiveGuides: (guides: SnapLine[]) => void
  setDocumentTitle: (title: string) => void
  /** Dismisses the restored-session notice without touching the document. */
  acknowledgeRestore: () => void
  setActiveMobileTab: (tab: MobileTab) => void
  setIsExportModalOpen: (open: boolean) => void
  setAspectRatio: (width: number, height: number) => void

  // Canvas view. `setViewport` is called by the workspace's ResizeObserver.
  setViewport: (width: number, height: number) => void
  setZoom: (zoom: number) => void
  zoomBy: (factor: number) => void
  fitToViewport: () => void
  addText: (type: TextBlockType) => void
  addImage: () => Promise<void>
  /** Swaps the artwork's photo, keeping the composition. */
  replaceImage: () => Promise<void>
  /**
   * Removes a photo's background with an on-device model, replacing its bitmap
   * while keeping the layout, grade and blur zones.
   *
   * Defaults to the selected image, then the primary photo; callers that know
   * which image they mean (the inspector, the context menu) pass it explicitly.
   */
  removeBackground: (
    target?: FabricObject,
    mode?: BackgroundRemovalMode
  ) => Promise<boolean>
  /** Person (portraits) or Object (general subjects). */
  setBackgroundRemovalMode: (mode: BackgroundRemovalMode) => void
  deleteActiveObject: (targetObj?: FabricObject | null) => void
  clearCanvas: () => void
  applyTemplate: (templateId: string) => void
  copyCanvasToClipboard: (scale?: number) => Promise<boolean>

  // Storage actions
  /**
   * Serialises the current document without writing it anywhere.
   *
   * The design library stores the same payload under its own key; sharing this
   * with autosave is what keeps the two representations identical.
   */
  captureDocument: () => ProjectPayload | null
  /** Restores the autosaved session, the thing a reload should bring back. */
  loadProjectFromStorage: () => Promise<boolean>
  /** Loads a payload that is already in memory - a design from the library. */
  loadProjectPayload: (
    payload: ProjectPayload,
    options?: { announce?: boolean }
  ) => Promise<boolean>
  /** Writes the autosaved document slot. Silent: it runs on a timer. */
  autosaveDocument: () => boolean

  // Clipboard actions
  copyActiveObject: () => Promise<void>
  cutActiveObject: () => Promise<void>
  pasteClipboardObject: () => Promise<void>
}

/**
 * ELEMENT SLICE: shapes, lines and icons inserted from the Elements panel.
 */
export interface ElementSlice {
  /** Inserts an element at the artboard's centre. No-op for an unknown id. */
  addElement: (id: string, colour?: string) => Promise<void>
  /** Recolours the selected element, if the selection is one. */
  setElementColor: (colour: string) => void
}

/**
 * DESIGN SLICE: the local library - save, open, rename and delete designs.
 */
export interface DesignSlice {
  /** Metadata for every saved design, newest first. */
  designs: DesignSummary[]
  /** The design the canvas belongs to, or null before the first save. */
  currentDesignId: string | null
  isDesignsOpen: boolean

  /** Migrates the old saved copy, then loads the list. Runs once on mount. */
  initializeDesigns: () => Promise<void>
  refreshDesigns: () => Promise<void>
  openDesigns: () => Promise<void>
  closeDesigns: () => void
  /** Writes the canvas into the current design, creating one if needed. */
  saveDesign: () => Promise<boolean>
  openDesign: (id: string) => Promise<boolean>
  newDesign: () => void
  renameDesign: (id: string, name: string) => Promise<void>
  removeDesign: (id: string) => Promise<void>
}

export type BackgroundRemovalStatus =
  "idle" | "loading" | "processing" | "done" | "error"

export interface BackgroundRemovalState {
  status: BackgroundRemovalStatus
  /** Model download, 0–100. */
  progress: number
  /** Why it failed, when it did. */
  message?: string
}

export type EditorStore = CoreSlice &
  FontSlice &
  HistorySlice &
  LayerSlice &
  ColorSlice &
  ContextMenuSlice &
  EffectSlice &
  ElementSlice &
  DesignSlice
