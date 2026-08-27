"use client"

import { useEditorStore } from "@/store/editorStore"
import { Canvas as FabricCanvas, FabricImage, IText } from "fabric"
import { UploadCloud } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setCanvas, setActiveObject } = useEditorStore()
  const [hasImage, setHasImage] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Initialize Fabric Canvas
    const canvas = new FabricCanvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: "#1C1C1E", // Match the artboard color
    })

    // Add border to default container right away
    const wrapper = canvas.getElement().parentElement
    if (wrapper) {
      wrapper.style.border = "1px solid rgba(255,255,255,0.05)"
    }

    setCanvas(canvas)

    // Sync active object to store
    canvas.on("selection:created", (e) =>
      setActiveObject(e.selected?.[0] || null)
    )
    canvas.on("selection:updated", (e) =>
      setActiveObject(e.selected?.[0] || null)
    )
    canvas.on("selection:cleared", () => setActiveObject(null))
    canvas.on("object:added", () => setHasImage(canvas.getObjects().length > 0))
    canvas.on("object:removed", () =>
      setHasImage(canvas.getObjects().length > 0)
    )

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

  // Unified logic for Drop and Click upload
  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0])
    // Reset input so the same file can be uploaded again if deleted
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} />

      {/* Hidden file input for mobile/click upload */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Empty State / Upload Button */}
      {!hasImage && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="pointer-events-auto flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/80 active:scale-95"
          >
            <UploadCloud size={40} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-semibold">Tap to upload image</p>
              <p className="mt-1 text-[11px] opacity-70">
                or drag and drop here
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
