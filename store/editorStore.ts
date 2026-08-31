import {
  getComplianceBadge,
  getContrastRatio,
  getLuminance,
  getVisibilityScore,
  hexToRgb,
} from "@/lib/colorUtils"
import { Canvas, FabricImage, FabricObject, IText, Shadow } from "fabric"
import { create } from "zustand"

export type TextBlockType = "quote" | "author" | "handle"
export type MobileTab = "templates" | "layers" | "edit" | "export" | null

export const ASPECT_RATIOS = {
  "1:1 (Square)": { width: 1080, height: 1080 },
  "9:16 (Reels/Story)": { width: 1080, height: 1920 },
  "4:5 (Portrait)": { width: 1080, height: 1350 },
  "16:9 (YouTube)": { width: 1920, height: 1080 },
}

interface ContrastStats {
  ratio: number
  score: number
  badge: "AAA" | "AA" | "FAIL"
  bgColor: string
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetObject: FabricObject | null
}

interface EditorState {
  canvas: Canvas | null
  activeObject: FabricObject | null
  activeMobileTab: MobileTab

  artboard: { width: number; height: number }
  getCanvasColor: (x: number, y: number) => string | null

  // Color Intelligence & Color Picker
  imagePalette: string[]
  contrastStats: ContrastStats | null
  isPickingColor: boolean
  colorPickerTarget: "fill" | "stroke" | "shadow" | "background" | null
  pickerSnapshot: HTMLCanvasElement | null
  colorPickerActiveObject: FabricObject | null

  // Figma-Style Context Menu
  contextMenu: ContextMenuState

  // History / Undo & Redo
  history: string[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
  isHistoryProcessing: boolean

  setCanvas: (canvas: Canvas) => void
  setActiveObject: (obj: FabricObject | null) => void
  setActiveMobileTab: (tab: MobileTab) => void

  // History Actions
  saveHistoryState: () => void
  undo: () => Promise<void>
  redo: () => Promise<void>

  // Context Menu Actions
  openContextMenu: (x: number, y: number, obj: FabricObject | null) => void
  closeContextMenu: () => void
  duplicateActiveObject: () => void

  // Layer Ordering Actions
  bringToFront: () => void
  bringForward: () => void
  sendBackward: () => void
  sendToBack: () => void
  moveLayerToIndex: (oldIndex: number, newIndex: number) => void
  toggleLayerLock: (obj?: FabricObject | null) => void
  toggleLayerVisibility: (obj?: FabricObject | null) => void

  // Color Eyedropper Actions
  startColorPicker: (
    target: "fill" | "stroke" | "shadow" | "background"
  ) => void
  stopColorPicker: () => void
  sampleCanvasColor: (x: number, y: number) => void
  pickColor: (
    target: "fill" | "stroke" | "shadow" | "background"
  ) => Promise<void>

  // Partial Selection & Typography Styling Helpers
  applyTextStyle: (key: string, value: any) => void
  getActiveSelectionStyle: (key: string) => any

  // Canvas Alignment Actions
  alignObjectToCanvas: (
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => void

  fitImageToCanvas: (mode: "fit" | "fill") => void

  // Color Intelligence Actions
  setImagePalette: (colors: string[]) => void
  calculateContrast: () => void
  autoColorText: () => void

  setAspectRatio: (width: number, height: number) => void
  addText: (type: TextBlockType) => void
  addImage: () => void
  deleteActiveObject: (targetObj?: FabricObject | null) => void
  clearCanvas: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: null,
  activeObject: null,
  activeMobileTab: null,

  imagePalette: [],
  contrastStats: null,

  isPickingColor: false,
  colorPickerTarget: null,
  pickerSnapshot: null,
  colorPickerActiveObject: null,

  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    targetObject: null,
  },

  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  isHistoryProcessing: false,

  setCanvas: (canvas) => set({ canvas }),

  setActiveObject: (activeObject) => {
    set({ activeObject })
    get().calculateContrast()
  },

  setActiveMobileTab: (tab) => {
    set({ activeMobileTab: tab })
  },

  setImagePalette: (colors) => {
    set({ imagePalette: colors })
  },

  // CONTEXT MENU MANAGEMENT
  openContextMenu: (x, y, obj) => {
    const { canvas } = get()
    if (obj && canvas && !obj.lockMovementX) {
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
    }
    set({
      contextMenu: {
        visible: true,
        x,
        y,
        targetObject: obj || get().activeObject,
      },
      activeObject: obj || get().activeObject,
    })
  },

  closeContextMenu: () => {
    set({
      contextMenu: { visible: false, x: 0, y: 0, targetObject: null },
    })
  },

  duplicateActiveObject: () => {
    const { canvas, activeObject, saveHistoryState } = get()
    if (!canvas || !activeObject) return

    activeObject.clone().then((cloned: FabricObject) => {
      cloned.set({
        left: (activeObject.left || 0) + 20,
        top: (activeObject.top || 0) + 20,
      })

      canvas.add(cloned)
      canvas.setActiveObject(cloned)
      canvas.requestRenderAll()
      set({ activeObject: cloned })
      saveHistoryState()
    })

    get().closeContextMenu()
  },

  // HISTORY / UNDO & REDO ENGINE
  saveHistoryState: () => {
    const { canvas, isHistoryProcessing, history, historyIndex } = get()
    if (!canvas || isHistoryProcessing) return

    try {
      const json = JSON.stringify(canvas.toJSON())
      const newHistory = history.slice(0, historyIndex + 1)

      if (newHistory[newHistory.length - 1] === json) return

      newHistory.push(json)

      if (newHistory.length > 50) newHistory.shift()

      const newIndex = newHistory.length - 1

      set({
        history: newHistory,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: false,
      })
    } catch (e) {
      console.error("Failed to save state history:", e)
    }
  },

  undo: async () => {
    const { canvas, history, historyIndex, canUndo, isHistoryProcessing } =
      get()
    if (!canvas || !canUndo || isHistoryProcessing || historyIndex <= 0) return

    const nextIndex = historyIndex - 1
    set({ isHistoryProcessing: true })

    try {
      await canvas.loadFromJSON(history[nextIndex])
      canvas.renderAll()

      set({
        historyIndex: nextIndex,
        canUndo: nextIndex > 0,
        canRedo: nextIndex < history.length - 1,
        isHistoryProcessing: false,
        activeObject: canvas.getActiveObject() || null,
      })
      get().calculateContrast()
    } catch (e) {
      set({ isHistoryProcessing: false })
    }
  },

  redo: async () => {
    const { canvas, history, historyIndex, canRedo, isHistoryProcessing } =
      get()
    if (
      !canvas ||
      !canRedo ||
      isHistoryProcessing ||
      historyIndex >= history.length - 1
    )
      return

    const nextIndex = historyIndex + 1
    set({ isHistoryProcessing: true })

    try {
      await canvas.loadFromJSON(history[nextIndex])
      canvas.renderAll()

      set({
        historyIndex: nextIndex,
        canUndo: nextIndex > 0,
        canRedo: nextIndex < history.length - 1,
        isHistoryProcessing: false,
        activeObject: canvas.getActiveObject() || null,
      })
      get().calculateContrast()
    } catch (e) {
      set({ isHistoryProcessing: false })
    }
  },

  // PARTIAL SELECTION STYLING (TEXT COLOR & FONT FAMILY)
  applyTextStyle: (key: string, value: any) => {
    const { canvas, activeObject, saveHistoryState, calculateContrast } = get()
    if (
      !canvas ||
      !activeObject ||
      activeObject.type !== "i-text" ||
      activeObject.lockMovementX
    )
      return

    const textObj = activeObject as IText

    if (textObj.isEditing && textObj.selectionStart !== textObj.selectionEnd) {
      textObj.setSelectionStyles({ [key]: value })
    } else {
      textObj.set(key, value)
    }

    canvas.requestRenderAll()
    calculateContrast()
    saveHistoryState()
  },

  getActiveSelectionStyle: (key: string) => {
    const { activeObject } = get()
    if (!activeObject || activeObject.type !== "i-text") return null

    const textObj = activeObject as IText
    if (textObj.isEditing && textObj.selectionStart !== textObj.selectionEnd) {
      const style = textObj.getSelectionStyles(
        textObj.selectionStart || 0,
        (textObj.selectionStart || 0) + 1
      )?.[0]
      return style?.[key as keyof typeof style] ?? textObj.get(key as any)
    }
    return textObj.get(key as any)
  },

  // CANVAS ALIGNMENT ACTIONS
  alignObjectToCanvas: (alignment) => {
    const { canvas, activeObject, saveHistoryState } = get()
    if (!canvas || !activeObject || activeObject.lockMovementX) return

    // derive true logical boundaries direct from the canvas instance
    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()

    const objWidth = activeObject.getScaledWidth()
    const objHeight = activeObject.getScaledHeight()

    const originX = activeObject.originX || "left"
    const originY = activeObject.originY || "top"

    let newLeft = activeObject.left || 0
    let newTop = activeObject.top || 0

    switch (alignment) {
      case "left":
        newLeft =
          originX === "center"
            ? objWidth / 2
            : originX === "right"
              ? objWidth
              : 0
        activeObject.set("left", newLeft)
        break
      case "center-h":
        newLeft =
          originX === "center"
            ? canvasWidth / 2
            : originX === "right"
              ? canvasWidth / 2 + objWidth / 2
              : canvasWidth / 2 - objWidth / 2
        activeObject.set("left", newLeft)
        break
      case "right":
        newLeft =
          originX === "center"
            ? canvasWidth - objWidth / 2
            : originX === "right"
              ? canvasWidth
              : canvasWidth - objWidth
        activeObject.set("left", newLeft)
        break
      case "top":
        newTop =
          originY === "center"
            ? objHeight / 2
            : originY === "bottom"
              ? objHeight
              : 0
        activeObject.set("top", newTop)
        break
      case "center-v":
        newTop =
          originY === "center"
            ? canvasHeight / 2
            : originY === "bottom"
              ? canvasHeight / 2 + objHeight / 2
              : canvasHeight / 2 - objHeight / 2
        activeObject.set("top", newTop)
        break
      case "bottom":
        newTop =
          originY === "center"
            ? canvasHeight - objHeight / 2
            : originY === "bottom"
              ? canvasHeight
              : canvasHeight - objHeight
        activeObject.set("top", newTop)
        break
    }

    activeObject.setCoords()
    canvas.requestRenderAll()
    saveHistoryState()
  },

  fitImageToCanvas: (mode) => {
    const { canvas, activeObject, saveHistoryState } = get()
    if (
      !canvas ||
      !activeObject ||
      activeObject.type !== "image" ||
      activeObject.lockMovementX
    )
      return

    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()

    const imgWidth = activeObject.width || 1
    const imgHeight = activeObject.height || 1

    const scaleX = canvasWidth / imgWidth
    const scaleY = canvasHeight / imgHeight

    const scale =
      mode === "fit" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)

    activeObject.set({
      scaleX: scale,
      scaleY: scale,
    })

    canvas.centerObject(activeObject)
    activeObject.setCoords()
    canvas.requestRenderAll()
    saveHistoryState()
  },

  // LAYER ORDERING & MANAGEMENT ENGINE
  bringToFront: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return
    canvas.bringObjectToFront(activeObject)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  bringForward: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return
    canvas.bringObjectForward(activeObject)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  sendBackward: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return
    canvas.sendObjectBackwards(activeObject)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  sendToBack: () => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    if (!canvas || !activeObject) return
    canvas.sendObjectToBack(activeObject)
    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  moveLayerToIndex: (oldIndex: number, newIndex: number) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    const objects = canvas.getObjects()
    if (
      oldIndex < 0 ||
      oldIndex >= objects.length ||
      newIndex < 0 ||
      newIndex >= objects.length
    )
      return

    const obj = objects[oldIndex]

    if (typeof (obj as any).moveTo === "function") {
      ;(obj as any).moveTo(newIndex)
    } else {
      const _objects = (canvas as any)._objects
      if (_objects) {
        _objects.splice(oldIndex, 1)
        _objects.splice(newIndex, 0, obj)
      }
    }

    canvas.requestRenderAll()
    saveHistoryState()
  },

  toggleLayerLock: (obj) => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    const target = obj || activeObject
    if (!canvas || !target) return

    const isLocked = !target.lockMovementX

    // Hard disabling all editing properties for robustness
    target.set({
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked,
      lockRotation: isLocked,
      hasControls: !isLocked,
      selectable: !isLocked,
      evented: !isLocked,
    })

    if (target.type === "i-text" || target.type === "text") {
      target.set("editable" as any, !isLocked)
    }

    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  toggleLayerVisibility: (obj) => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    const target = obj || activeObject
    if (!canvas || !target) return

    target.set("visible", !target.visible)

    canvas.requestRenderAll()
    closeContextMenu()
    saveHistoryState()
  },

  // EYEDROPPER COLOR PICKER TOOL
  startColorPicker: (target) => {
    const { canvas } = get()
    let snapshot: HTMLCanvasElement | null = null
    const activeObj = canvas?.getActiveObject() || null

    if (canvas) {
      try {
        // Temporarily hide controls so they aren't part of the picked color
        let prevControls = false
        let prevBorders = false

        if (activeObj) {
          prevControls = activeObj.hasControls ?? true
          prevBorders = activeObj.hasBorders ?? true
          activeObj.set({ hasControls: false, hasBorders: false })
          canvas.renderAll()
        }

        snapshot = canvas.toCanvasElement()

        // Restore controls
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

  sampleCanvasColor: (x: number, y: number) => {
    const {
      canvas,
      colorPickerTarget,
      colorPickerActiveObject,
      applyTextStyle,
      calculateContrast,
      saveHistoryState,
      getCanvasColor,
    } = get()

    if (!canvas || !colorPickerTarget) return

    const hex = getCanvasColor(x, y)

    if (!hex) {
      get().stopColorPicker()
      return
    }

    // Restore the targeted object in case picking clicked background & broke selection
    const activeObj = colorPickerActiveObject || canvas.getActiveObject()
    if (activeObj) {
      if (canvas.getActiveObject() !== activeObj) {
        canvas.setActiveObject(activeObj)
        set({ activeObject: activeObj })
      }

      if (colorPickerTarget === "fill") {
        applyTextStyle("fill", hex)
      } else if (colorPickerTarget === "stroke") {
        applyTextStyle("stroke", hex)
      } else if (colorPickerTarget === "shadow") {
        const currentShadow = activeObj.get("shadow") as Shadow | null
        if (currentShadow) {
          activeObj.set("shadow", new Shadow({ ...currentShadow, color: hex }))
        } else {
          activeObj.set(
            "shadow",
            new Shadow({ color: hex, blur: 15, offsetX: 4, offsetY: 4 })
          )
        }
        canvas.requestRenderAll()
        calculateContrast()
        saveHistoryState()
      }
    }

    get().stopColorPicker()
  },

  pickColor: async (target) => {
    const {
      startColorPicker,
      applyTextStyle,
      calculateContrast,
      saveHistoryState,
      canvas,
    } = get()

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
          if (currentShadow) {
            activeObj.set("shadow", new Shadow({ ...currentShadow, color }))
          } else {
            activeObj.set(
              "shadow",
              new Shadow({ color, blur: 15, offsetX: 4, offsetY: 4 })
            )
          }
          canvas?.requestRenderAll()
          calculateContrast()
          saveHistoryState()
        }
      } catch (e) {
        startColorPicker(target)
      }
    } else {
      startColorPicker(target)
    }
  },

  // INTERNAL ENGINE
  getCanvasColor: (x: number, y: number) => {
    const { pickerSnapshot } = get()
    if (!pickerSnapshot) return null

    try {
      // Using willReadFrequently to optimize the canvas context for repeating getImageData extraction
      const ctx = pickerSnapshot.getContext("2d", { willReadFrequently: true })
      if (!ctx) return null

      // Clamping bounds to safeguard extraction
      const px = Math.max(0, Math.min(Math.round(x), pickerSnapshot.width - 1))
      const py = Math.max(0, Math.min(Math.round(y), pickerSnapshot.height - 1))

      const pixelData = ctx.getImageData(px, py, 1, 1).data
      const r = pixelData[0],
        g = pixelData[1],
        b = pixelData[2],
        a = pixelData[3]

      if (a === 0) return "#000000"

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

  calculateContrast: () => {
    const { canvas, activeObject } = get()

    // Only calculate if a text object is selected
    if (!canvas || !activeObject || activeObject.type !== "i-text") {
      set({ contrastStats: null })
      return
    }

    // 1. Temporarily hide the text object so we can see the background behind it
    activeObject.set("visible", false)
    canvas.renderAll()

    try {
      const rect = activeObject.getBoundingRect()
      const ctx = canvas.getContext()

      const retinaScaling = canvas.getRetinaScaling()

      // Convert Fabric coordinates to actual canvas pixels
      const left = Math.max(0, Math.floor(rect.left * retinaScaling))

      const top = Math.max(0, Math.floor(rect.top * retinaScaling))

      const width = Math.max(
        1,
        Math.min(
          Math.ceil(rect.width * retinaScaling),
          canvas.getWidth() * retinaScaling - left
        )
      )

      const height = Math.max(
        1,
        Math.min(
          Math.ceil(rect.height * retinaScaling),
          canvas.getHeight() * retinaScaling - top
        )
      )

      // Sample pixels underneath text
      const imageData = ctx.getImageData(left, top, width, height)

      // 2. Unhide the text immediately so the user never sees a flicker
      activeObject.set("visible", true)
      canvas.renderAll()
      //3. Average the RGB values of the background color
      let r = 0,
        g = 0,
        b = 0,
        count = 0

      // Step by 16 (4 pixels at a time) for massive performance boost during dragging
      for (let i = 0; i < imageData.data.length; i += 16) {
        r += imageData.data[i]
        g += imageData.data[i + 1]
        b += imageData.data[i + 2]
        count++
      }

      if (count === 0) {
        set({ contrastStats: null })
        return
      }

      r = Math.round(r / count)
      g = Math.round(g / count)
      b = Math.round(b / count)

      const bgHex =
        "#" +
        [r, g, b]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()

      // Text properties
      const textFill = (activeObject.get("fill") as string) || "#FFFFFF"
      const fontSize = (activeObject.get("fontSize") as number) || 40

      const rawWeight = activeObject.get("fontWeight")
      const fontWeight =
        typeof rawWeight === "number"
          ? rawWeight
          : rawWeight === "bold"
            ? 700
            : 400

      // WCAG calculations
      const contrastRatio = getContrastRatio(textFill, bgHex)
      const score = getVisibilityScore(contrastRatio, fontSize, fontWeight)
      const badge = getComplianceBadge(contrastRatio, fontSize, fontWeight)

      //Update state with live metrics
      set({
        contrastStats: { ratio: contrastRatio, score, badge, bgColor: bgHex },
      })
    } catch (error) {
      // Always restore the object if sampling fails
      activeObject.set("visible", true)
      canvas.renderAll()
      set({ contrastStats: null })
    }
  },

  // Smart feature: Flip text to White or Black depending on background brightness
  autoColorText: () => {
    const { activeObject, contrastStats, applyTextStyle } = get()
    if (!activeObject || activeObject.type !== "i-text" || !contrastStats)
      return

    const bgRgb = hexToRgb(contrastStats.bgColor)
    const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b)

    // Standard WCAG breakpoint: if background is light, use black. If dark, use white.
    const optimalTextColor = bgLuminance > 0.179 ? "#000000" : "#FFFFFF"
    applyTextStyle("fill", optimalTextColor)
  },

  artboard: { width: 1080, height: 1080 },

  setAspectRatio: (width: number, height: number) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    set({ artboard: { width, height } })
    // Backstore maintains unscaled high-resolution layout size
    canvas.setDimensions({ width, height }, { backstoreOnly: true })

    const container = canvas.getElement().parentElement?.parentElement
    if (container) {
      const scale = Math.min(
        (container.clientWidth - 80) / width,
        (container.clientHeight - 80) / height
      )

      // CSS scaling natively handles responsive downsizing
      canvas.setDimensions(
        { width: width * scale, height: height * scale },
        { cssOnly: true }
      )

      // This stops double scaling and locks the coordinate system map to 1:1, perfectly syncing bounding boxes, mouse tracking, and alignment
      canvas.setZoom(1)

      // Add a distinct shadow and border to the Fabric wrapper so it looks like an Artboard
      const wrapper = canvas.getElement().parentElement
      if (wrapper) {
        wrapper.style.boxShadow = "0 20px 50px rgba(0,0,0,0.8)"
        wrapper.style.border = "1px solid rgba(255,255,255,0.1)"
        wrapper.style.backgroundColor = "#1C1C1E"
      }
    }

    canvas.requestRenderAll()
    saveHistoryState()
  },

  addImage: () => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    // Create a hidden input programmatically
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (f) => {
        const data = f.target?.result as string
        try {
          const img = await FabricImage.fromURL(data)
          img.set("crossOrigin", "anonymous")

          const scale = Math.min(
            canvas.getWidth() / (img.width || 1),
            canvas.getHeight() / (img.height || 1)
          )
          img.scale(scale * 0.9)
          canvas.centerObject(img)

          // Images added through this action
          // also go behind text
          canvas.insertAt(0, img)
          canvas.setActiveObject(img)
          canvas.requestRenderAll()
          saveHistoryState()
        } catch (error) {
          console.error("Failed to load image:", error)
        }
      }
      reader.readAsDataURL(file)
    }
    // Trigger the file browser
    input.click()
  },

  deleteActiveObject: (targetObj) => {
    const { canvas, activeObject, saveHistoryState, closeContextMenu } = get()
    const target = targetObj || activeObject

    if (!canvas || !target || target.lockMovementX) return // Guard protected layers from deletion

    canvas.remove(target)
    canvas.discardActiveObject()
    canvas.requestRenderAll()

    set({ activeObject: null, contrastStats: null })
    closeContextMenu()
    saveHistoryState()
  },

  addText: (type: TextBlockType) => {
    const { canvas, saveHistoryState } = get()
    if (!canvas) return

    let textStr = ""
    const options: Record<string, string | number | Shadow> = {
      fill: "#ffffff",
      originX: "center",
      originY: "center",
      shadow: new Shadow({
        color: "rgba(0,0,0,0.5)",
        blur: 10,
        offsetX: 2,
        offsetY: 2,
      }),
    }

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
        textStr = "— Albert Camus"
        Object.assign(options, {
          fontFamily: "Montserrat",
          fontSize: 24,
          fontStyle: "italic",
          opacity: 0.8,
        })
        break
      case "handle":
        textStr = "@cinemate"
        Object.assign(options, {
          fontFamily: "Inter",
          fontSize: 16,
          charSpacing: 200,
          opacity: 0.6,
        })
        break
    }

    const textObject = new IText(textStr, {
      ...options,
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
    })

    canvas.add(textObject)
    canvas.setActiveObject(textObject)
    canvas.requestRenderAll()
    saveHistoryState()
  },
  // CLEAR CANVAS

  clearCanvas: () =>
    set((state) => {
      state.canvas?.clear()
      state.canvas?.dispose()

      return {
        canvas: null,
        activeObject: null,
        contrastStats: null,
        imagePalette: [],
        history: [],
        historyIndex: -1,
        canUndo: false,
        canRedo: false,
      }
    }),
}))
