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
  } = useEditorStore()

  const [hasImage, setHasImage] = useState(false)

  // Manage custom crosshair overriding the fabric default pointer cursors when picking
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
      setHasImage(canvas.getObjects().some((object) => object.type === "image"))
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
        // Stop default action and selection behavior from disrupting our tool
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
      if (
        activeObj &&
        activeObj.type === "i-text" &&
        (activeObj as IText).isEditing
      )
        return

      const targetTag = (e.target as HTMLElement)?.tagName
      if (["INPUT", "TEXTAREA", "SELECT"].includes(targetTag)) return

      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      const code = e.code

      if (isCmdOrCtrl && (key === "z" || code === "KeyZ") && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (
        (isCmdOrCtrl && (key === "z" || code === "KeyZ") && e.shiftKey) ||
        (isCmdOrCtrl && (key === "y" || code === "KeyY"))
      ) {
        e.preventDefault()
        redo()
        return
      }
      if (isCmdOrCtrl && (key === "d" || code === "KeyD")) {
        e.preventDefault()
        duplicateActiveObject()
        return
      }
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
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        useEditorStore.getState().deleteActiveObject()
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
        // --------------------------------------------------------------
        // 1. Load Image into Fabric
        // --------------------------------------------------------------

        const img = await FabricImage.fromURL(data)

        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          canvas.getWidth() / (img.width || 1),
          canvas.getHeight() / (img.height || 1)
        )

        img.scale(scale * 0.9)

        canvas.centerObject(img)

        // Keep uploaded image behind text/other objects
        canvas.insertAt(0, img)

        canvas.setActiveObject(img)

        // --------------------------------------------------------------
        // 2. Extract Image Palette
        // --------------------------------------------------------------

        const palette = await extractPalette(data, 6)

        useEditorStore.getState().setImagePalette(palette)

        // Make sure the canvas renders after adding the image
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

      {/* Floating Precision Magnifier UI - Rendered offset from Cursor to avoid blocking */}
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

      {/* Banner */}
      {isPickingColor && !pickerPreview && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-30 flex -translate-x-1/2 animate-bounce items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
          <Pipette size={14} />
          Click anywhere to sample color
        </div>
      )}

      {!hasImage && (
        <div className="pointer-events-none absolute right-0 bottom-4 left-0 flex justify-center">
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
