"use client"

import { useEditorStore } from "@/store/useEditorStore"
import { AlertTriangle, CheckCircle2, Droplet, PaintBucket } from "lucide-react"

export default function ColorPanel() {
  const { activeObject, contrastStats, imagePalette, autoColorText, canvas } =
    useEditorStore()

  if (!activeObject || activeObject.type !== "i-text") {
    return <p>Select a text layer to view color intelligence.</p>
  }

  const applyColor = (hex: string) => {
    if (!activeObject || !canvas) return
    activeObject.set("fill", hex)
    canvas.requestRenderAll()
    // Force recalculation of contrast with new color
    useEditorStore.getState().calculateContrast()
  }

  return (
    <>
      {/* 1. CONTRAST METER & VISIBILITY SCORE */}
      <div className="relative overflow-hidden rounded-md border border-white/[0.05] bg-white/[0.02] p-4">
        {/* Background glow based on status */}
        <div
          className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-20 blur-3xl ${
            !contrastStats
              ? "bg-transparent"
              : contrastStats.badge === "FAIL"
                ? "bg-red-500"
                : "bg-green-500"
          }`}
        />

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
            Visibility Engine
          </h3>
          {contrastStats && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-white/40">
                BG: {contrastStats.bgColor}
              </span>
              <div
                className="h-3 w-3 rounded-full border border-white/20"
                style={{ backgroundColor: contrastStats.bgColor }}
              />
            </div>
          )}
        </div>

        {!contrastStats ? (
          <div className="py-4 text-center text-[13px] text-white/40">
            Move text over the image to calculate contrast.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[32px] leading-none font-light tracking-tight text-white">
                  {contrastStats.score}
                  <span className="ml-1 text-[14px] text-white/40">/100</span>
                </div>
                <div className="mt-1 text-[12px] text-white/50">
                  Overall Readability
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {contrastStats.badge === "FAIL" ? (
                  <div className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-400">
                    <AlertTriangle size={10} /> FAIL
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded bg-green-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green-400">
                    <CheckCircle2 size={10} /> {contrastStats.badge} PASS
                  </div>
                )}
                <div className="font-mono text-[12px] text-white/60">
                  {contrastStats.ratio.toFixed(2)} : 1
                </div>
              </div>
            </div>

            {/* Smart Auto-Color Button */}
            <button
              onClick={autoColorText}
              className="cursor-pointer mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-transform hover:bg-blue-400 active:scale-95"
            >
              <PaintBucket size={16} className="fill-white/20" />
              Smart Auto-Color
            </button>
          </div>
        )}
      </div>

      {/* 2. EXTRACTED CINEMATIC PALETTE */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
            Cinematic Palette
          </h3>
          <Droplet size={14} className="text-white/30" />
        </div>

        {imagePalette.length === 0 ? (
          <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-4 text-center text-[13px] text-white/40">
            Upload an image to extract colors.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {imagePalette.map((color, i) => (
              <button
                key={i}
                onClick={() => applyColor(color)}
                className="group relative flex flex-col items-center gap-2"
              >
                <div
                  className="aspect-square w-full rounded-md border border-white/10 shadow-inner transition-transform hover:scale-105 active:scale-90"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-[10px] text-white/40 uppercase transition-colors group-hover:text-white/80">
                  {color}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
