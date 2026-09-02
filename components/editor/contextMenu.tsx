"use client"

import { useEditorStore } from "@/store/useEditorStore"
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Delete,
  Eye,
  EyeOff,
  Lock,
  Maximize,
  Minimize,
  Trash2,
  Unlock,
} from "lucide-react"
import { useEffect, useRef } from "react"

export default function ContextMenu() {
  const {
    contextMenu,
    closeContextMenu,
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,
    duplicateActiveObject,
    toggleLayerLock,
    toggleLayerVisibility,
    deleteActiveObject,
    fitImageToCanvas,
  } = useEditorStore()

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu()
    }

    if (contextMenu.visible) {
      window.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [contextMenu.visible, closeContextMenu])

  if (!contextMenu.visible) return null

  const target = contextMenu.targetObject
  const isLocked = target ? target.lockMovementX : false
  const isVisible = target ? target.visible : true
  const isImage = target?.type === "image"

  // Reposition inside viewport bounds
  const menuWidth = 220
  const menuHeight = 280
  const adjustedX = Math.min(contextMenu.x, window.innerWidth - menuWidth - 16)
  const adjustedY = Math.min(
    contextMenu.y,
    window.innerHeight - menuHeight - 16
  )

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-[220px] animate-in rounded border border-white/15 bg-[#1C1C1E]/95 p-1.5 font-sans text-[12px] text-white shadow-2xl backdrop-blur-2xl duration-150 zoom-in-95 fade-in"
      onContextMenu={(e) => e.preventDefault()}
    >
      {isImage && (
        <>
          <div className="space-y-0.5">
            <button
              onClick={() => {
                fitImageToCanvas("fill")
                closeContextMenu()
              }}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <Maximize size={14} className="text-white/60" />
                Fill Canvas
              </span>
            </button>
            <button
              onClick={() => {
                fitImageToCanvas("fit")
                closeContextMenu()
              }}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <Minimize size={14} className="text-white/60" />
                Fit to Canvas
              </span>
            </button>
          </div>
          <div className="my-1.5 h-px bg-white/10" />
        </>
      )}

      {/* Layer Depth Actions */}
      <div className="space-y-0.5">
        <button
          onClick={bringToFront}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <ChevronsUp size={14} className="text-white/60" />
            Bring to Front
          </span>
          <span className="font-mono text-[10px] text-white/50">⌘ + ]</span>
        </button>

        <button
          onClick={bringForward}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <ArrowUp size={14} className="text-white/60" />
            Bring Forward
          </span>
          <span className="font-mono text-[10px] text-white/50">⌘ + ⌥]</span>
        </button>

        <button
          onClick={sendBackward}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <ArrowDown size={14} className="text-white/60" />
            Send Backward
          </span>
          <span className="font-mono text-[10px] text-white/50">⌘ + ⌥[</span>
        </button>

        <button
          onClick={sendToBack}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <ChevronsDown size={14} className="text-white/60" />
            Send to Back
          </span>
          <span className="font-mono text-[10px] text-white/50">⌘ + [</span>
        </button>
      </div>

      <div className="my-1.5 h-px bg-white/10" />

      {/* Transform & State Actions */}
      <div className="space-y-0.5">
        <button
          onClick={duplicateActiveObject}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <Copy size={14} className="text-white/60" />
            Duplicate
          </span>
          <span className="font-mono text-[10px] text-white/50">⌘ + D</span>
        </button>

        <button
          onClick={() => toggleLayerLock(target)}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            {isLocked ? (
              <Lock size={14} className="text-amber-400" />
            ) : (
              <Unlock size={14} className="text-white/60" />
            )}
            {isLocked ? "Unlock Layer" : "Lock Layer"}
          </span>
          <span className="font-mono text-[10px] text-white/50">⌘ + L</span>
        </button>

        <button
          onClick={() => toggleLayerVisibility(target)}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            {isVisible ? (
              <Eye size={14} className="text-white/60" />
            ) : (
              <EyeOff size={14} className="text-red-400" />
            )}
            {isVisible ? "Hide Layer" : "Show Layer"}
          </span>
        </button>
      </div>

      <div className="my-1.5 h-px bg-white/10" />

      {/* Delete Action */}
      <button
        onClick={() => deleteActiveObject(target)}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 font-medium text-red-400 transition-colors hover:bg-red-500/20"
      >
        <span className="flex items-center gap-2.5">
          <Trash2 size={14} />
          Delete
        </span>
        <Delete size={16} className="text-red-400/50" />
      </button>
    </div>
  )
}
