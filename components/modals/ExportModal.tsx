"use client"

import { useEditorStore } from "@/store/useEditorStore"
import { Download, FileImage, X } from "lucide-react"
import { useState } from "react"
import { AppleSlider } from "../functions"

const SCALE_PRESETS = [
  { label: "0.5x", value: 0.5, desc: "Web Draft" },
  { label: "1x", value: 1, desc: "Standard" },
  { label: "2x", value: 2, desc: "High-Res" },
  { label: "3x", value: 3, desc: "Ultra HD" },
]

export default function ExportModal() {
  const { isExportModalOpen, setIsExportModalOpen, canvas } = useEditorStore()

  const [format, setFormat] = useState<"png" | "jpg">("png")
  const [quality, setQuality] = useState(0.92) // 92% quality default for JPG
  const [scale, setScale] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  if (!isExportModalOpen) return null

  // Calculate output dimensions
  const baseW = canvas?.getWidth() || 1080
  const baseH = canvas?.getHeight() || 1080
  const outputW = Math.round(baseW * scale)
  const outputH = Math.round(baseH * scale)

  const handleDownload = async () => {
    if (!canvas) return
    setIsExporting(true)

    try {
      // 1. Temporarily deselect any active object so bounding boxes/handles are excluded
      const activeObj = canvas.getActiveObject()
      canvas.discardActiveObject()
      canvas.requestRenderAll()

      // 2. Fabric's multiplier option renders the canvas scaled up in-memory without breaking layout
      const dataUrl = canvas.toDataURL({
        format: format === "jpg" ? "jpeg" : "png",
        quality: quality,
        multiplier: scale,
      })

      // 3. Re-select the active object
      if (activeObj) {
        canvas.setActiveObject(activeObj)
        canvas.requestRenderAll()
      }

      // 4. Programmatic download link trigger
      const link = document.createElement("a")
      link.download = `cinemate-${Date.now()}.${format === "jpg" ? "jpg" : "png"}`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Close modal on success
      setIsExportModalOpen(false)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/70 p-4 backdrop-blur-md duration-150 fade-in">
      <div
        className="relative w-full max-w-md animate-in overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414] p-6 font-sans text-white shadow-2xl duration-150 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D6B47A]/10 text-[#D6B47A]">
              <Download size={15} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-white">
                Export Artwork
              </h2>
              <p className="text-[10px] text-white/40">
                Render high-resolution visual
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 py-5">
          {/* 1. FORMAT SWITCHER */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
              Format
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
              <button
                onClick={() => setFormat("png")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-medium transition-all ${
                  format === "png"
                    ? "bg-white font-semibold text-black shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <FileImage size={14} />
                PNG (Lossless)
              </button>
              <button
                onClick={() => setFormat("jpg")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-medium transition-all ${
                  format === "jpg"
                    ? "bg-white font-semibold text-black shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <FileImage size={14} />
                JPG (Smaller)
              </button>
            </div>
          </div>

          {/* 2. QUALITY SLIDER (JPG Only) */}
          {format === "jpg" && (
            <div className="animate-in space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 duration-150 fade-in">
              <AppleSlider
                label="JPEG Quality"
                value={Math.round(quality * 100)}
                min={10}
                max={100}
                step={1}
                onChange={(val) => setQuality(val / 100)}
              />
              <span className="block text-[9px] text-white/30">
                Higher quality produces clearer gradients with larger file
                sizes.
              </span>
            </div>
          )}

          {/* 3. SIZE & RESOLUTION PRESETS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                Resolution Presets
              </label>
              <span className="font-mono text-[10px] text-[#D6B47A]">
                {outputW} × {outputH} px
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SCALE_PRESETS.map((p) => {
                const isActive = scale === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setScale(p.value)}
                    className={`flex flex-col items-center justify-center rounded-xl border py-2.5 transition-all ${
                      isActive
                        ? "border-[#D6B47A] bg-[#D6B47A]/10 text-white shadow-sm"
                        : "border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/[0.15] hover:text-white"
                    }`}
                  >
                    <span className="text-[12px] font-semibold">{p.label}</span>
                    <span className="text-[8px] text-white/40">{p.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="border-t border-white/[0.06] pt-4">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#D6B47A] py-3 text-[12px] font-semibold text-black transition-all hover:bg-[#e2c492] active:scale-[0.98] disabled:opacity-50"
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border border-black/30 border-t-black" />
                Rendering {outputW}×{outputH}...
              </span>
            ) : (
              <>
                <Download size={15} />
                Download {format.toUpperCase()} ({outputW}×{outputH})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
