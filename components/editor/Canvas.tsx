"use client"

import { useEditorStore } from "@/store/editorStore"
import { Canvas as FabricCanvas, FabricImage, IText } from "fabric"
import { useEffect, useRef } from "react"

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { setCanvas, setActiveObject } = useEditorStore()

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Initialize Fabric Canvas
    const canvas = new FabricCanvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: "#0A0A0A",
    })

    setCanvas(canvas)

    // Sync active object to store
    canvas.on("selection:created", (e) =>
      setActiveObject(e.selected?.[0] || null)
    )
    canvas.on("selection:updated", (e) =>
      setActiveObject(e.selected?.[0] || null)
    )
    canvas.on("selection:cleared", () => setActiveObject(null))

    // KEYBOARD LISTENER: Delete objects
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent deleting if the user is typing inside an active IText block!
      const activeObj = canvas.getActiveObject()
      if (activeObj && activeObj.type === "i-text") {
        const textObj = activeObj as IText
        if (textObj.isEditing) return // Don't delete while they are typing text
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        useEditorStore.getState().deleteActiveObject()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      canvas.dispose()
    }
  }, [setCanvas, setActiveObject])

  // Handle Drag & Drop Upload
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.onload = async (f) => {
      const data = f.target?.result as string
      const canvas = useEditorStore.getState().canvas
      if (!canvas) return

      try {
        // Promise-based image loading
        const img = await FabricImage.fromURL(data)

        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          canvas.getWidth() / (img.width || 1),
          canvas.getHeight() / (img.height || 1)
        )

        img.scale(scale * 0.9) // 90% of canvas size
        canvas.centerObject(img)
        canvas.add(img)
        canvas.setActiveObject(img)
      } catch (error) {
        console.error("Failed to load image into Fabric:", error)
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center bg-slate-950"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} />
      <div className="pointer-events-none absolute bottom-4 text-sm text-slate-400 opacity-50">
        Drag and drop an image here
      </div>
    </div>
  )
}
