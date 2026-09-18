"use client"

import { extractPalette } from "@/lib/colorUtils"
import { useEditorStore } from "@/store/useEditorStore"
import {
  Canvas as FabricCanvas,
  FabricImage,
  FabricObject,
  IText,
} from "fabric"
import { Pipette } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pickerPreview, setPickerPreview] = useState<{
    color: string
    x: number
    y: number
  } | null>(null)

  const {
    setCanvas,
    setActiveObject,
    saveHistoryState,
    undo,
    redo,
    openContextMenu,
    closeContextMenu,
    isPickingColor,
    sampleCanvasColor,
    getCanvasColor,
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,
    duplicateActiveObject,
    grainIntensity, // 1. Grabbing grain intensity state
  } = useEditorStore()

  const [hasImage, setHasImage] = useState(false)

  useEffect(() => {
    const canvas = useEditorStore.getState().canvas
    if (!canvas) return

    if (isPickingColor) {
      canvas.defaultCursor = "crosshair"
      canvas.hoverCursor = "crosshair"
      canvas.getObjects().forEach((obj) => {
        obj.set("hoverCursor", "crosshair")
      })
      canvas.requestRenderAll()
    } else {
      canvas.defaultCursor = "default"
      canvas.hoverCursor = "move"
      canvas.getObjects().forEach((obj) => {
        obj.set("hoverCursor", null)
      })
      canvas.requestRenderAll()
    }
  }, [isPickingColor])

  useEffect(() => {
    if (!isPickingColor) setPickerPreview(null)
  }, [isPickingColor])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = new FabricCanvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: "#1C1C1E",
      fireRightClick: true,
      stopContextMenu: true,
    })

    const wrapper = canvas.getElement().parentElement
    if (wrapper) wrapper.style.border = "1px solid rgba(255,255,255,0.05)"

    setCanvas(canvas)
    saveHistoryState()

    canvas.on("selection:created", (e) =>
      setActiveObject(e.selected?.[0] || null)
    )
    canvas.on("selection:updated", (e) =>
      setActiveObject(e.selected?.[0] || null)
    )
    canvas.on("selection:cleared", () => setActiveObject(null))

    const handleObjectsChanged = () => {
      // Adjusted to ensure effect layers don't trigger "has image" flag errantly
      setHasImage(
        canvas
          .getObjects()
          .some(
            (object) => object.type === "image" && !(object as any).isEffect
          )
      )
      saveHistoryState()
    }

    canvas.on("object:added", handleObjectsChanged)
    canvas.on("object:removed", handleObjectsChanged)
    canvas.on("object:modified", () => {
      saveHistoryState()
      triggerContrastCalc()
    })

    const triggerContrastCalc = () => {
      const activeObj = canvas.getActiveObject()
      if (activeObj && activeObj.type === "i-text") {
        useEditorStore.getState().calculateContrast()
      }
    }

    canvas.on("object:moving", triggerContrastCalc)
    canvas.on("object:scaling", triggerContrastCalc)

    canvas.on("mouse:move", (opt) => {
      if (useEditorStore.getState().isPickingColor) {
        const e = opt.e as MouseEvent
        const pointer = canvas.getScenePoint(e)
        const color = getCanvasColor(pointer.x, pointer.y)

        if (color) {
          setPickerPreview({ color, x: e.clientX, y: e.clientY })
        }
      }
    })

    canvas.on("mouse:out", () => {
      if (useEditorStore.getState().isPickingColor) {
        setPickerPreview(null)
      }
    })

    canvas.on("mouse:down", (opt) => {
      const e = opt.e as MouseEvent

      if (useEditorStore.getState().isPickingColor) {
        e.preventDefault()
        e.stopPropagation()
        const pointer = canvas.getScenePoint(e)
        sampleCanvasColor(pointer.x, pointer.y)
        return
      }

      if (e.button === 2) {
        e.preventDefault()
        e.stopPropagation()
        const targetObj = (opt.target as FabricObject) || null
        openContextMenu(e.clientX, e.clientY, targetObj)
      } else {
        closeContextMenu()
      }
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeObj = canvas.getActiveObject()

      // Never hijack keys if user is actively typing in an IText layer
      if (
        activeObj &&
        activeObj.type === "i-text" &&
        (activeObj as IText).isEditing
      ) {
        return
      }

      // Never hijack keys if user is focused inside an input, select, textarea, or contentEditable
      const targetElement = e.target as HTMLElement | null
      const targetTag = targetElement?.tagName
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(targetTag || "") ||
        targetElement?.isContentEditable
      ) {
        return
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      const code = e.code

      // 1. UNDO: Ctrl+Z / Cmd+Z (without Shift)
      if (isCmdOrCtrl && (key === "z" || code === "KeyZ") && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // 2. REDO: Ctrl+Y / Cmd+Shift+Z
      if (
        (isCmdOrCtrl && (key === "z" || code === "KeyZ") && e.shiftKey) ||
        (isCmdOrCtrl && (key === "y" || code === "KeyY"))
      ) {
        e.preventDefault()
        redo()
        return
      }

      // 3. DUPLICATE: Ctrl+D / Cmd+D
      if (isCmdOrCtrl && (key === "d" || code === "KeyD")) {
        e.preventDefault()
        duplicateActiveObject()
        return
      }

      // 4. QUICK SAVE TO STORAGE: Ctrl+S / Cmd+S
      if (isCmdOrCtrl && (key === "s" || code === "KeyS")) {
        e.preventDefault()
        useEditorStore.getState().saveProjectToStorage()
        return
      }

      // 5. DELETE: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        useEditorStore.getState().deleteActiveObject()
        return
      }

      // 6. DESELECT / CLOSE: Escape
      if (e.key === "Escape") {
        e.preventDefault()
        canvas.discardActiveObject()
        canvas.requestRenderAll()
        closeContextMenu()
        return
      }
      // 7. COPY ELEMENT: Ctrl+C / Cmd+C
      if (isCmdOrCtrl && (key === "c" || code === "KeyC")) {
        e.preventDefault()
        useEditorStore.getState().copyActiveObject()
        return
      }

      // 8. CUT ELEMENT: Ctrl+X / Cmd+X
      if (isCmdOrCtrl && (key === "x" || code === "KeyX")) {
        e.preventDefault()
        useEditorStore.getState().cutActiveObject()
        return
      }

      // 9.PASTE ELEMENT: Ctrl+V / Cmd+V
      if (isCmdOrCtrl && (key === "v" || code === "KeyV")) {
        e.preventDefault()
        useEditorStore.getState().pasteClipboardObject()
        return
      }

      // 10. LAYER ORDER SHORTCUTS
      if (isCmdOrCtrl && key === "]" && !e.altKey) {
        e.preventDefault()
        bringToFront()
        return
      }
      if (isCmdOrCtrl && key === "]" && e.altKey) {
        e.preventDefault()
        bringForward()
        return
      }
      if (isCmdOrCtrl && key === "[" && !e.altKey) {
        e.preventDefault()
        sendToBack()
        return
      }
      if (isCmdOrCtrl && key === "[" && e.altKey) {
        e.preventDefault()
        sendBackward()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      canvas.dispose()
    }
  }, [
    setCanvas,
    setActiveObject,
    saveHistoryState,
    undo,
    redo,
    openContextMenu,
    closeContextMenu,
    sampleCanvasColor,
    getCanvasColor,
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,
    duplicateActiveObject,
  ])

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = async (f) => {
      const data = f.target?.result as string
      const canvas = useEditorStore.getState().canvas
      if (!canvas) return
      try {
        const img = await FabricImage.fromURL(data)
        const scale = Math.min(
          canvas.getWidth() / (img.width || 1),
          canvas.getHeight() / (img.height || 1)
        )
        img.scale(scale * 0.9)
        canvas.centerObject(img)
        canvas.insertAt(0, img)
        canvas.setActiveObject(img)

        const palette = await extractPalette(data, 6)
        useEditorStore.getState().setImagePalette(palette)
        canvas.requestRenderAll()
      } catch (error) {
        console.error("Failed to load image or extract palette:", error)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full items-center justify-center ${
        isPickingColor ? "cursor-crosshair" : ""
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0])
      }}
    >
      <canvas ref={canvasRef} className="rounded-xl" />

      {/* 2. FILM GRAIN SVG LAYER OVERLAY */}
      {grainIntensity > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-40 mix-blend-overlay"
          style={{ opacity: grainIntensity / 100 }}
        >
          <svg
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full opacity-60"
            preserveAspectRatio="none"
          >
            <filter id="cinematic-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.65"
                numOctaves="3"
                stitchTiles="stitch"
              />
            </filter>
            <rect width="100%" height="100%" filter="url(#cinematic-noise)" />
          </svg>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) processFile(e.target.files[0])
          if (fileInputRef.current) fileInputRef.current.value = ""
        }}
      />

      {isPickingColor && pickerPreview && (
        <div
          className="pointer-events-none fixed z-[99999] flex flex-col items-center gap-2"
          style={{
            left: pickerPreview.x,
            top: pickerPreview.y,
            transform: "translate(20px, -70px)",
          }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
            style={{ backgroundColor: pickerPreview.color }}
          />
          <div className="rounded-md bg-black/80 px-2 py-1 font-mono text-[10px] text-white shadow-lg backdrop-blur-md">
            {pickerPreview.color}
          </div>
        </div>
      )}

      {isPickingColor && !pickerPreview && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-30 flex -translate-x-1/2 animate-bounce items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
          <Pipette size={14} />
          Click anywhere to sample color
        </div>
      )}

      {!hasImage && (
        <div className="pointer-events-none absolute right-0 bottom-4 left-0 z-50 flex justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="pointer-events-auto cursor-pointer text-xs text-white/30 transition-colors hover:text-white/60"
          >
            Tap to upload an image · or drag & drop
          </button>
        </div>
      )}
    </div>
  )
}
