import { Canvas, FabricObject } from "fabric"

import type { EffectSnapshot } from "@/lib/snapshot"
import type { VisibilityReport } from "@/lib/visibility"
import { CustomFontMetadata } from "@/lib/customFonts"

export type TextBlockType = "quote" | "author" | "handle" | "signature"
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
   * leaving the Cinema tool reset the controls while the image kept its grade —
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
   * the inspector that three layers are selected — the panel described one
   * object while the artboard showed a group, and Delete removed one object and
   * discarded the rest.
   */
  selectedObjects: FabricObject[]
  activeMobileTab: MobileTab
  artboard: { width: number; height: number }
  isExportModalOpen: boolean
  hasSavedProject: boolean
  lastSavedAt: string | null
  clipboardObject: FabricObject | null

  /** The workspace name. Persisted with the project and used for export filenames. */
  documentTitle: string
  /** True when the document has changed since the last save. */
  isDirty: boolean

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

  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  /** Records a whole selection; the first object becomes `activeObject`. */
  setSelection: (objects: FabricObject[]) => void
  setDocumentTitle: (title: string) => void
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
  deleteActiveObject: (targetObj?: FabricObject | null) => void
  clearCanvas: () => void
  applyTemplate: (templateId: string) => void
  copyCanvasToClipboard: (scale?: number) => Promise<boolean>

  // Storage actions
  saveProjectToStorage: () => boolean
  loadProjectFromStorage: () => Promise<boolean>
  clearSavedProject: () => void
  checkSavedProject: () => void

  // Clipboard actions
  copyActiveObject: () => Promise<void>
  cutActiveObject: () => Promise<void>
  pasteClipboardObject: () => Promise<void>
}

export type EditorStore = CoreSlice &
  FontSlice &
  HistorySlice &
  LayerSlice &
  ColorSlice &
  ContextMenuSlice &
  EffectSlice
