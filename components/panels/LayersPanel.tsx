"use client"

import { useEditorStore } from "@/store/useEditorStore"
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Trash2,
  Type,
  Unlock,
} from "lucide-react"
import { useState } from "react"

export default function LayersPanel() {
  const {
    canvas,
    activeObject,
    moveLayerToIndex,
    toggleLayerLock,
    toggleLayerVisibility,
    deleteActiveObject,
  } = useEditorStore()

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const objects = canvas?.getObjects() || []

  if (objects.length === 0) {
    return (
      <div className="p-4 text-sm text-white/50">
        No elements on canvas. Add text or images to manage layers.
      </div>
    )
  }

  // Display top layers first
  const layerList = [...objects].reverse()

  const handleDragStart = (e: React.DragEvent, actualIndex: number) => {
    setDraggedIndex(actualIndex)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, actualIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverIndex !== actualIndex) {
      setDragOverIndex(actualIndex)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropActualIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropActualIndex) {
      moveLayerToIndex(draggedIndex, dropActualIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
          Canvas Layers
        </h3>

        <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/40">
          {objects.length}
        </span>
      </div>

      {/* LAYER LIST */}
      <div className="space-y-2">
        {layerList.map((obj) => {
          const actualIndex = objects.indexOf(obj)
          const isSelected = activeObject === obj
          const isText = obj.type === "i-text"

          const rawText =
            isText && typeof (obj as any).text === "string"
              ? (obj as any).text
              : ""

          const textPreview = isText
            ? rawText.trim().substring(0, 20) || "Empty Text"
            : "Background Image"

          return (
            <div
              key={actualIndex}
              draggable
              onDragStart={(e) => handleDragStart(e, actualIndex)}
              onDragOver={(e) => handleDragOver(e, actualIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, actualIndex)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                // Ensure users can still select hidden & locked items to manipulate from right panel
                canvas?.setActiveObject(obj)
                canvas?.requestRenderAll()
                useEditorStore.getState().setActiveObject(obj)
              }}
              className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition-all ${
                isSelected
                  ? "border-white/20 bg-white/[0.08] text-white shadow-lg"
                  : "border-white/[0.05] bg-white/[0.02] text-white/60 hover:bg-white/[0.04]"
              } ${
                dragOverIndex === actualIndex
                  ? "border-t-2 border-[#D6B47A] bg-white/[0.06]"
                  : ""
              } ${draggedIndex === actualIndex ? "opacity-40" : "opacity-100"}`}
            >
              {/* LAYER INFO */}
              <div className="pointer-events-none flex min-w-0 items-center gap-3 overflow-hidden">
                <span className={isSelected ? "text-white" : "text-white/40"}>
                  {isText ? <Type size={16} /> : <ImageIcon size={16} />}
                </span>

                <div className="flex min-w-0 flex-col overflow-hidden">
                  <span className="truncate text-[13px] font-medium">
                    {textPreview}
                  </span>

                  <span className="font-mono text-[10px] text-white/30">
                    Layer #{actualIndex + 1}
                  </span>
                </div>
              </div>

              {/* LAYER ACTIONS */}
              <div
                className="ml-2 flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {/* VISIBILITY */}
                <button
                  type="button"
                  onClick={() => toggleLayerVisibility(obj)}
                  title={obj.visible ? "Hide Layer" : "Show Layer"}
                  className="cursor-pointer rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {obj.visible ? (
                    <Eye size={14} />
                  ) : (
                    <EyeOff size={14} className="text-red-400" />
                  )}
                </button>

                {/* LOCK */}
                <button
                  type="button"
                  onClick={() => toggleLayerLock(obj)}
                  title={obj.lockMovementX ? "Unlock Layer" : "Lock Layer"}
                  className="cursor-pointer rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {obj.lockMovementX ? (
                    <Lock size={14} className="text-amber-400" />
                  ) : (
                    <Unlock size={14} />
                  )}
                </button>

                <div className="mx-1 h-4 w-px bg-white/10" />

                {/* MOVE UP */}
                <button
                  type="button"
                  disabled={actualIndex === objects.length - 1}
                  onClick={() => moveLayerToIndex(actualIndex, actualIndex + 1)}
                  title="Move Up"
                  className="cursor-pointer rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                >
                  <ArrowUp size={14} />
                </button>

                {/* MOVE DOWN */}
                <button
                  type="button"
                  disabled={actualIndex === 0}
                  onClick={() => moveLayerToIndex(actualIndex, actualIndex - 1)}
                  title="Move Down"
                  className="cursor-pointer rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* DELETE SELECTED */}
      {activeObject && (
        <div className="border-t border-white/[0.08] pt-4">
          <button
            type="button"
            onClick={() => deleteActiveObject()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-red-500/10 py-3 text-[13px] font-medium text-red-500 transition-all hover:bg-red-500/20 active:scale-95"
          >
            <Trash2 size={16} />
            Delete Selected Layer
          </button>
        </div>
      )}
    </div>
  )
}
