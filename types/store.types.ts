import { Canvas, FabricObject } from "fabric"

export type TextBlockType = "quote" | "author" | "handle"
export type MobileTab = "templates" | "layers" | "edit" | "export" | null

export interface ContrastStats {
  ratio: number
  score: number
  badge: "AAA" | "AA" | "FAIL"
  bgColor: string
}

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetObject: FabricObject | null
}

/**
 * CORE SLICE: Manages the canvas initialization, global selections,
 * artboard dimensions, and adding/removing base objects.
 */
export interface CoreSlice {
  canvas: Canvas | null
  activeObject: FabricObject | null
  activeMobileTab: MobileTab
  artboard: { width: number; height: number }

  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  setActiveMobileTab: (tab: MobileTab) => void
  setAspectRatio: (width: number, height: number) => void
  addText: (type: TextBlockType) => void
  addImage: () => void
  deleteActiveObject: (targetObj?: FabricObject | null) => void
  clearCanvas: () => void
}

/**
 * HISTORY SLICE: Manages the undo/redo stack using JSON snapshots of the canvas.
 */
export interface HistorySlice {
  history: string[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
  isHistoryProcessing: boolean

  saveHistoryState: () => void
  undo: () => Promise<void>
  redo: () => Promise<void>
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
  contrastStats: ContrastStats | null
  isPickingColor: boolean
  colorPickerTarget: "fill" | "stroke" | "shadow" | "background" | null
  pickerSnapshot: HTMLCanvasElement | null
  colorPickerActiveObject: FabricObject | null

  getCanvasColor: (x: number, y: number) => string | null
  setImagePalette: (colors: string[]) => void
  calculateContrast: () => void
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

// src/types/store.types.ts (Replace only the EffectSlice part)

export interface VignetteState {
  id: string
  opacity: number
  type: "radial" | "linear"
  color: string
}

export interface BlurZoneState {
  id: string
  overlayId: string
  opacity: number
}

export interface LetterboxState {
  id: string
  topId: string
  bottomId: string
}

export interface EffectSlice {
  grainIntensity: number
  gradientOpacity: number

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
  applyPreset: (matrix: number[]) => void
  applyWarmth: (value: number) => void
  applyDuotone: (lightHex: string, darkHex: string) => void
  resetEffect: (
    category: "adjustments" | "cinematic" | "atmospherics" | "all"
  ) => void

  // Multi-instance Generators
  addVignette: (initialConfig?: Partial<VignetteState>) => void
  updateVignette: (id: string, updates: Partial<VignetteState>) => void
  removeVignette: (id: string) => void

  addBlurZone: () => Promise<void>
  updateBlurZone: (id: string, opacity: number) => void
  removeBlurZone: (id: string) => void

  addLetterbox: (thicknessRatio: number) => void
  removeLetterbox: (id: string) => void
}

export interface ContrastStats {
  ratio: number
  score: number
  badge: "AAA" | "AA" | "FAIL"
  bgColor: string
}

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetObject: FabricObject | null
}

/**
 * CORE SLICE: Manages the canvas initialization, global selections,
 * artboard dimensions, and adding/removing base objects.
 */
export interface CoreSlice {
  canvas: Canvas | null
  activeObject: FabricObject | null
  activeMobileTab: MobileTab
  artboard: { width: number; height: number }
  isExportModalOpen: boolean

  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  setActiveMobileTab: (tab: MobileTab) => void
  setIsExportModalOpen: (open: boolean) => void
  setAspectRatio: (width: number, height: number) => void
  addText: (type: TextBlockType) => void
  addImage: () => void
  deleteActiveObject: (targetObj?: FabricObject | null) => void
  clearCanvas: () => void
  applyTemplate: (templateId: string) => void
  copyCanvasToClipboard: (scale?: number) => Promise<boolean>
}

export type EditorStore = CoreSlice &
  HistorySlice &
  LayerSlice &
  ColorSlice &
  ContextMenuSlice &
  EffectSlice
