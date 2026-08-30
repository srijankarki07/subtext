"use client"

import { useEditorStore } from "@/store/editorStore"
import { Canvas as FabricCanvas, FabricImage, IText } from "fabric"
import { UploadCloud } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { extractPalette } from "@/lib/colorUtils"

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
      backgroundColor: "#1C1C1E",
    })

    // Add border to default container right away
    const wrapper = canvas.getElement().parentElement

    if (wrapper) {
      wrapper.style.border = "1px solid rgba(255,255,255,0.05)"
    }

    setCanvas(canvas)

    // ------------------------------------------------------------------
    // Selection Events
    // ------------------------------------------------------------------

    canvas.on("selection:created", (e) => {
      setActiveObject(e.selected?.[0] || null)
    })

    canvas.on("selection:updated", (e) => {
      setActiveObject(e.selected?.[0] || null)
    })

    canvas.on("selection:cleared", () => {
      setActiveObject(null)
    })

    // ------------------------------------------------------------------
    // Image State
    // ------------------------------------------------------------------

    const updateHasImage = () => {
      setHasImage(canvas.getObjects().some((object) => object.type === "image"))
    }

    canvas.on("object:added", updateHasImage)
    canvas.on("object:removed", updateHasImage)

    // ------------------------------------------------------------------
    // LIVE CONTRAST ENGINE
    //
    // Recalculate contrast whenever an IText object is:
    // - moved
    // - scaled
    // - modified
    // ------------------------------------------------------------------

    const triggerContrastCalc = () => {
      const activeObj = canvas.getActiveObject()

      if (activeObj && activeObj.type === "i-text") {
        useEditorStore.getState().calculateContrast()
      }
    }

    canvas.on("object:moving", triggerContrastCalc)
    canvas.on("object:scaling", triggerContrastCalc)
    canvas.on("object:modified", triggerContrastCalc)

    // ------------------------------------------------------------------
    // Keyboard Listener: Delete / Backspace
    // ------------------------------------------------------------------

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeObj = canvas.getActiveObject()

      // Don't delete the IText object while the user is typing.
      if (activeObj && activeObj.type === "i-text") {
        const textObj = activeObj as IText

        if (textObj.isEditing) return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        useEditorStore.getState().deleteActiveObject()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    // ------------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------------

    return () => {
      window.removeEventListener("keydown", handleKeyDown)

      canvas.off("object:added", updateHasImage)
      canvas.off("object:removed", updateHasImage)

      canvas.off("object:moving", triggerContrastCalc)
      canvas.off("object:scaling", triggerContrastCalc)
      canvas.off("object:modified", triggerContrastCalc)

      canvas.dispose()
    }
  }, [setCanvas, setActiveObject])

  // --------------------------------------------------------------------
  // IMAGE UPLOAD
  // --------------------------------------------------------------------

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

  // --------------------------------------------------------------------
  // DRAG & DROP
  // --------------------------------------------------------------------

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    if (e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  // --------------------------------------------------------------------
  // FILE INPUT
  // --------------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0])
    }

    // Reset input so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // --------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} />

      {/* Hidden file input */}
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
