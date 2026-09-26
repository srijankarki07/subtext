"use client"

import { useEditorStore } from "@/store/useEditorStore"
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartVertical,
  Maximize,
  Minimize,
  MoveLeft,
  MoveRight,
  Trash2,
} from "lucide-react"
import { AlignmentButton } from "../functions"

export default function ImagePanel() {
  const {
    activeObject,
    alignObjectToCanvas,
    fitImageToCanvas,
    deleteActiveObject,
  } = useEditorStore()

  if (!activeObject || activeObject.type !== "image") {
    return null
  }

  return (
    <div className="flex flex-col gap-6 p-1 pb-24">
      {/* 1. ASPECT RATIO SIZING */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
            Image Sizing
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fitImageToCanvas("fill")}
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-white/[0.05] bg-white/[0.02] py-4 text-white/70 transition-all hover:bg-white/[0.06] hover:text-white active:scale-95"
          >
            <Maximize size={18} />
            <span className="text-[11px] font-medium">Fill Canvas</span>
          </button>

          <button
            onClick={() => fitImageToCanvas("fit")}
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-white/[0.05] bg-white/[0.02] py-4 text-white/70 transition-all hover:bg-white/[0.06] hover:text-white active:scale-95"
          >
            <Minimize size={18} />
            <span className="text-[11px] font-medium">Fit to Canvas</span>
          </button>
        </div>
      </div>

      {/* 2. CANVAS ALIGNMENT */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
            Alignment
          </h3>
        </div>
        <div className="grid grid-cols-6 gap-1 rounded-md border border-white/[0.05] bg-white/[0.04] p-1.5">
          <AlignmentButton
            icon={<MoveLeft size={16} />}
            onClick={() => alignObjectToCanvas("left")}
          />
          <AlignmentButton
            icon={<AlignCenterHorizontal size={16} />}
            onClick={() => alignObjectToCanvas("center-h")}
          />
          <AlignmentButton
            icon={<MoveRight size={16} />}
            onClick={() => alignObjectToCanvas("right")}
          />
          <AlignmentButton
            icon={<AlignStartVertical size={16} />}
            onClick={() => alignObjectToCanvas("top")}
          />
          <AlignmentButton
            icon={<AlignCenterVertical size={16} />}
            onClick={() => alignObjectToCanvas("center-v")}
          />
          <AlignmentButton
            icon={<AlignEndVertical size={16} />}
            onClick={() => alignObjectToCanvas("bottom")}
          />
        </div>
      </div>

      {/* 3. DELETE */}
      <div className="border-t border-white/[0.08] pt-2">
        <button
          onClick={() => deleteActiveObject()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-red-500/10 py-3 text-[13px] font-medium text-red-500 transition-all hover:bg-red-500/20 active:scale-95"
        >
          <Trash2 size={16} />
          Remove Image
        </button>
      </div>
    </div>
  )
}
