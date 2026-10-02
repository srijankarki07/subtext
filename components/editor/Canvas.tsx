"use client"

import { DEFAULT_ARTBOARD_BACKGROUND } from "@/lib/fabricDocument"
import { importImage, isImageFile } from "@/lib/imageImport"
import { useEditorStore } from "@/store/useEditorStore"
import { Canvas as FabricCanvas, FabricObject, IText } from "fabric"
import { ImagePlus, Loader2, Pipette, UploadCloud } from "lucide-react"
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

  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)

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
    grainIntensity,
  } = useEditorStore()

  /**
   * Whether the artboard holds anything at all.
   *
   * The empty-state prompt is gated on this rather than on whether an image is
   * present. That prompt covers the artboard and captures pointer events, so
   * gating it on the image alone made the whole artboard dead in a text-only
   * document — a quote you had just added could not be clicked or dragged.
   */
  const [hasContent, setHasContent] = useState(false)

  useEffect(() => {
    const canvas = useEditorStore.getState().canvas
    if (!canvas) return

    if (isPickingColor) {
      canvas.defaultCursor = "crosshair"
      canvas.hoverCursor = "crosshair"
      canvas.getObjects().forEach((obj) => obj.set("hoverCursor", "crosshair"))
      canvas.requestRenderAll()
    } else {
      canvas.defaultCursor = "default"
      canvas.hoverCursor = "move"
      canvas.getObjects().forEach((obj) => obj.set("hoverCursor", null))
      canvas.requestRenderAll()
    }
  }, [isPickingColor])

  useEffect(() => {
    if (!isPickingColor) setPickerPreview(null)
  }, [isPickingColor])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Start at the artboard's logical size, not the container's. Sizing the
    // document to whatever the viewport happened to be meant the artboard was
    // nominally 1080x1080 in the store while the canvas was e.g. 1060x637, so
    // export dimensions and overlay geometry disagreed with the artboard.
    // On-screen scale is applied separately as a CSS size.
    const { artboard } = useEditorStore.getState()

    const canvas = new FabricCanvas(canvasRef.current, {
      width: artboard.width,
      height: artboard.height,
      backgroundColor: DEFAULT_ARTBOARD_BACKGROUND,
      fireRightClick: true,
      stopContextMenu: true,
    })

    // No border here: CanvasWorkspace draws the artboard's hairline, and doing
    // it in both places produced a 2px double edge.
    setCanvas(canvas)
    saveHistoryState("Initial Canvas")

    canvas.on("selection:created", (e) =>
      setActiveObject(e.selected?.[0] || null)
    )
    canvas.on("selection:updated", (e) =>
      setActiveObject(e.selected?.[0] || null)
    )
    canvas.on("selection:cleared", () => setActiveObject(null))

    const handleObjectsChanged = () => {
      // Effect layers (vignettes, letterbox bars, gradients) are still objects,
      // so an artboard holding only an effect counts as non-empty too.
      setHasContent(canvas.getObjects().length > 0)
      saveHistoryState()
    }

    canvas.on("object:added", handleObjectsChanged)
    canvas.on("object:removed", handleObjectsChanged)
    canvas.on("object:modified", () => {
      saveHistoryState("Modified Object")
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
      if (isCmdOrCtrl && (key === "c" || code === "KeyC")) {
        e.preventDefault()
        useEditorStore.getState().copyActiveObject()
        return
      }
      if (isCmdOrCtrl && (key === "x" || code === "KeyX")) {
        e.preventDefault()
        useEditorStore.getState().cutActiveObject()
        return
      }
      if (isCmdOrCtrl && (key === "v" || code === "KeyV")) {
        e.preventDefault()
        useEditorStore.getState().pasteClipboardObject()
        return
      }
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

      // 6. DESELECT / CANCEL / CLOSE: Escape
      if (e.key === "Escape") {
        const store = useEditorStore.getState()

        // An open dialog owns Escape. Without this guard the canvas would also
        // deselect behind the dialog and swallow the key.
        if (
          store.isExportModalOpen ||
          store.confirmDialog ||
          store.alertDialog
        ) {
          return
        }

        e.preventDefault()

        // Cancel the eyedropper. This was never handled anywhere, so Escape
        // left the canvas in sampling mode and the next click — meant as a
        // deselect — sampled a colour instead.
        if (store.isPickingColor) {
          store.stopColorPicker()
        }

        canvas.discardActiveObject()
        canvas.requestRenderAll()
        closeContextMenu()
        return
      }

      // Zoom. "=" as well as "+" because the plus key needs Shift on most
      // layouts while the unshifted key is "=".
      if (isCmdOrCtrl && (key === "+" || key === "=")) {
        e.preventDefault()
        useEditorStore.getState().zoomBy(1.2)
        return
      }
      if (isCmdOrCtrl && (key === "-" || key === "_")) {
        e.preventDefault()
        useEditorStore.getState().zoomBy(1 / 1.2)
        return
      }
      if (isCmdOrCtrl && key === "0") {
        e.preventDefault()
        useEditorStore.getState().fitToViewport()
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
    if (!isImageFile(file)) return

    const canvas = useEditorStore.getState().canvas
    if (!canvas) return

    setIsProcessingImage(true)
    try {
      // Shared with the store's addImage so both upload paths behave the same
      // and always extract a palette.
      const result = await importImage(canvas, file)
      if (!result) return

      useEditorStore.getState().setImagePalette(result.palette)
      canvas.requestRenderAll()
      saveHistoryState("Upload image")
    } catch (error) {
      console.error("Failed to load image or extract palette:", error)
    } finally {
      setIsProcessingImage(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full ${
        isPickingColor ? "cursor-crosshair" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDraggingOver(true)
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDraggingOver(false)
        if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0])
      }}
    >
      {/*
        The artboard box. Two things here are load-bearing:

        1. `m-auto` rather than flex centring on the parent: centring an
           oversized child inside a scroll container makes its top and left
           overflow unreachable, so a zoomed-in artboard could not be scrolled
           to its own corner.
        2. `relative`: every overlay below is absolutely positioned, and without
           a positioned ancestor here they resolve against the outer root
           instead — so the empty state, the drop outline and the film grain all
           covered the whole workspace rather than the artwork. That is why
           clicking anywhere opened the file picker.
      */}
      <div className="relative m-auto shrink-0 overflow-hidden rounded-xl shadow-artboard ring-1 ring-[var(--color-on-workspace-hairline)]">
        <canvas ref={canvasRef} />

        {/* 1. DRAG-AND-DROP ACTIVE OVERLAY */}
        {isDraggingOver && (
          <div className="z-canvas-overlay pointer-events-none absolute inset-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/40 bg-black/50 backdrop-blur-md">
            <UploadCloud
              size={34}
              aria-hidden="true"
              className="animate-bounce text-[var(--color-on-workspace)]"
            />
            <span className="mt-2.5 text-[14px] font-semibold text-[var(--color-on-workspace)]">
              Drop image to frame
            </span>
            <span className="text-[11px] text-[var(--color-on-workspace-muted)]">
              PNG, JPG or WebP
            </span>
          </div>
        )}

        {/* 2. IMAGE PROCESSING LOADING OVERLAY */}
        {isProcessingImage && (
          <div
            role="status"
            className="z-canvas-overlay pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/60 backdrop-blur-md"
          >
            <Loader2
              size={30}
              aria-hidden="true"
              className="animate-spin text-[var(--color-on-workspace)]"
            />
            <span className="mt-3 text-[12px] font-medium text-[var(--color-on-workspace)]">
              Processing image and extracting its palette…
            </span>
          </div>
        )}

        {/* 3. FILM GRAIN SVG OVERLAY */}
        {grainIntensity > 0 && (
          <div
            className="z-canvas-overlay pointer-events-none absolute inset-0 mix-blend-overlay"
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

        {/* 4. FLOATING EYEDROPPER MAGNIFIER */}
        {isPickingColor && pickerPreview && (
          <div
            className="z-cursor-preview pointer-events-none fixed flex flex-col items-center gap-2"
            style={{
              // Nudge inward from the pointer, but flip near the right and top
              // edges so the swatch and its readout are never cut off.
              left: pickerPreview.x,
              top: pickerPreview.y,
              transform:
                typeof window !== "undefined" &&
                pickerPreview.x > window.innerWidth - 90
                  ? "translate(-84px, -70px)"
                  : "translate(20px, -70px)",
            }}
          >
            <div
              className="flex size-12 items-center justify-center rounded-full border-[3px] border-white shadow-lg"
              style={{ backgroundColor: pickerPreview.color }}
            />
            <div className="rounded-md bg-black/80 px-2 py-1 font-mono text-[10px] text-white shadow-lg backdrop-blur-md">
              {pickerPreview.color}
            </div>
          </div>
        )}

        {isPickingColor && !pickerPreview && (
          <div
            role="status"
            className="z-canvas-hint pointer-events-none absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-medium text-primary-foreground shadow-lg"
          >
            <Pipette size={14} aria-hidden="true" />
            Click anywhere to sample a colour
          </div>
        )}

        {/* 5. CANVAS EMPTY STATE — only on a genuinely empty artboard, so it
            never blocks interaction with existing layers. */}
        {!hasContent && (
          <div
            // The whole artboard is a drop target and now a click target too.
            // It used to be `pointer-events-none` with a single text button
            // enabled, so the obvious affordance — click the artwork area —
            // did nothing.
            role="button"
            tabIndex={0}
            aria-label="Upload a photo"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className="z-canvas-overlay absolute inset-0 flex cursor-pointer flex-col items-center justify-center text-center outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[var(--color-on-workspace-muted)]"
          >
            <h2 className="text-[15px] font-medium text-[var(--color-on-workspace)]">
              Start with an image
            </h2>
            <p className="mt-1.5 text-[12px] text-[var(--color-on-workspace-muted)]">
              Drop a photo here, or click to choose a file
            </p>
            <span className="mt-4 rounded-lg border border-[var(--color-on-workspace-hairline)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-on-workspace)]">
              Upload photo
            </span>
            <span className="mt-4 text-[11px] text-[var(--color-on-workspace-faint)]">
              Your image stays in your browser.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
