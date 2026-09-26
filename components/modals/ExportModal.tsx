"use client"

import { useState } from "react"
import { Check, Copy, Download, FileImage, Loader2, X } from "lucide-react"

import { AppleSlider } from "@/components/functions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

const SCALE_PRESETS = [
  { label: "0.5×", value: 0.5, desc: "Draft" },
  { label: "1×", value: 1, desc: "Standard" },
  { label: "2×", value: 2, desc: "High-res" },
  { label: "3×", value: 3, desc: "Ultra" },
]

/** Turns the workspace name into a filename-safe stem. */
export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return slug || "subtext"
}

/**
 * Export.
 *
 * Rebuilt on the Dialog primitive, so it gains Escape, backdrop dismissal, a
 * focus trap and proper dialog roles — previously the only way out was a 28px
 * unlabelled X, and the backdrop's `stopPropagation` implied a dismissal that
 * did not exist. Format and scale now share one selection language instead of
 * `bg-white` for one and gold for the other, and the two competing radius
 * scales are gone.
 *
 * The download filename is derived from the workspace name, which is what the
 * document title input was always for.
 */
export default function ExportModal() {
  const isExportModalOpen = useEditorStore((s) => s.isExportModalOpen)
  const setIsExportModalOpen = useEditorStore((s) => s.setIsExportModalOpen)
  const canvas = useEditorStore((s) => s.canvas)
  const copyCanvasToClipboard = useEditorStore((s) => s.copyCanvasToClipboard)
  const setAlertDialog = useEditorStore((s) => s.setAlertDialog)
  const documentTitle = useEditorStore((s) => s.documentTitle)

  const [format, setFormat] = useState<"png" | "jpg">("png")
  const [quality, setQuality] = useState(0.92)
  const [scale, setScale] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const baseW = canvas?.getWidth() || 1080
  const baseH = canvas?.getHeight() || 1080
  const outputW = Math.round(baseW * scale)
  const outputH = Math.round(baseH * scale)

  const extension = format === "jpg" ? "jpg" : "png"
  const filename = `${slugifyTitle(documentTitle)}-${outputW}x${outputH}.${extension}`

  const handleDownload = async () => {
    if (!canvas) return
    setIsExporting(true)

    try {
      // Deselect first so selection handles are not baked into the export.
      const activeObj = canvas.getActiveObject()
      canvas.discardActiveObject()
      canvas.requestRenderAll()

      const dataUrl = canvas.toDataURL({
        format: format === "jpg" ? "jpeg" : "png",
        quality,
        multiplier: scale,
      })

      if (activeObj) {
        canvas.setActiveObject(activeObj)
        canvas.requestRenderAll()
      }

      const link = document.createElement("a")
      link.download = filename
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setIsExportModalOpen(false)
    } catch (error) {
      console.error("Export failed:", error)
      setAlertDialog({
        title: "Export failed",
        message:
          "The artwork could not be rendered. Try a smaller export size or a different format.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopy = async () => {
    setIsCopying(true)
    setCopied(false)
    const success = await copyCanvasToClipboard(scale)
    setIsCopying(false)

    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } else {
      setAlertDialog({
        title: "Copy failed",
        message:
          "Could not copy to the clipboard. Check this browser's clipboard permission and try again.",
      })
    }
  }

  const busy = isExporting || isCopying

  return (
    <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
      {isExportModalOpen && (
        <DialogContent className="max-w-md p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Export artwork</DialogTitle>
              <DialogDescription>
                Rendered at {outputW} × {outputH} px
              </DialogDescription>
            </div>
            <button
              type="button"
              aria-label="Close export"
              onClick={() => setIsExportModalOpen(false)}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition-colors hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-medium text-foreground">
                Format
              </span>
              <SegmentedControl
                label="Export format"
                value={format}
                onChange={setFormat}
                options={[
                  {
                    value: "png",
                    label: "PNG",
                    icon: <FileImage size={13} aria-hidden="true" />,
                  },
                  {
                    value: "jpg",
                    label: "JPG",
                    icon: <FileImage size={13} aria-hidden="true" />,
                  },
                ]}
              />
            </div>

            {format === "jpg" && (
              <div className="rounded-lg border border-border p-3">
                <AppleSlider
                  label="JPEG quality"
                  value={Math.round(quality * 100)}
                  min={10}
                  max={100}
                  step={1}
                  onChange={(value) => setQuality(value / 100)}
                />
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Higher quality keeps gradients smooth at a larger file size.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-medium text-foreground">
                  Resolution
                </span>
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {outputW} × {outputH} px
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {SCALE_PRESETS.map((preset) => {
                  const active = scale === preset.value
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setScale(preset.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center rounded-lg border py-2 outline-none transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                        active
                          ? "border-primary/40 bg-primary/[0.06] text-foreground"
                          : "border-border text-[var(--text-secondary)] hover:bg-subtle-hover"
                      )}
                    >
                      <span className="text-[12px] font-medium">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {preset.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
            <Button onClick={handleDownload} disabled={busy} className="w-full">
              {isExporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Rendering {outputW}×{outputH}…
                </>
              ) : (
                <>
                  <Download size={14} aria-hidden="true" />
                  Download {format.toUpperCase()}
                </>
              )}
            </Button>

            <Button
              variant={copied ? "secondary" : "outline"}
              onClick={handleCopy}
              disabled={busy}
              className={cn(
                "w-full",
                copied && "text-emerald-700 dark:text-emerald-400"
              )}
            >
              {isCopying ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Copying…
                </>
              ) : copied ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  Copied to clipboard
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" />
                  Copy PNG to clipboard
                </>
              )}
            </Button>

            <p className="truncate text-center text-[11px] text-[var(--text-muted)]">
              Saves as {filename}
            </p>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
