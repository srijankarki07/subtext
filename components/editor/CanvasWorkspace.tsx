"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { useEditorStore } from "@/store/useEditorStore"

const DynamicCanvas = dynamic(() => import("@/components/editor/Canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-workspace">
      <div className="flex flex-col items-center gap-3">
        <div className="relative size-7">
          <div className="absolute inset-0 rounded-full border border-[var(--color-on-workspace-hairline)]" />
          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[var(--color-on-workspace-muted)]" />
        </div>
        <span className="text-[10px] tracking-[0.16em] text-[var(--color-on-workspace-faint)] uppercase">
          Preparing canvas
        </span>
      </div>
    </div>
  ),
})

/**
 * The artboard workspace.
 *
 * The artwork is the hero (design doc §2), so the workspace is the only dark
 * surface in an otherwise light app: paper chrome, white panels, and this.
 * The decorative gold glow and the "Artboard" / "100%" badge chrome that used
 * to sit over it are gone — they were interface noise around the artwork.
 *
 * The scale readout is measured from the live canvas rather than hardcoded.
 * The old `100%` was a string literal and was wrong whenever the artboard was
 * scaled to fit.
 */

function ZoomReadout() {
  const canvas = useEditorStore((s) => s.canvas)
  const artboard = useEditorStore((s) => s.artboard)
  const [scale, setScale] = useState<number | null>(null)

  useEffect(() => {
    if (!canvas) return
    const el = canvas.getElement()
    if (!el) return

    const measure = () => {
      const logical = canvas.getWidth()
      if (logical > 0) setScale(el.clientWidth / logical)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [canvas, artboard])

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-[var(--color-on-workspace-hairline)] bg-black/40 px-2.5 py-1.5 text-[11px] text-[var(--color-on-workspace-muted)] backdrop-blur-md lg:bottom-4">
      <span className="tabular-nums">
        {scale === null ? "—" : `${Math.round(scale * 100)}%`}
      </span>
      <span className="text-[var(--color-on-workspace-faint)]">·</span>
      <span className="tabular-nums">
        {artboard.width} × {artboard.height}
      </span>
    </div>
  )
}

export default function CanvasWorkspace() {
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-workspace p-3 sm:p-5 lg:p-8">
      {/* The artboard reads as a physical object on the workspace: a hairline
          and a soft shadow, no other chrome. */}
      <div className="relative h-full w-full overflow-hidden rounded-xl shadow-artboard ring-1 ring-[var(--color-on-workspace-hairline)]">
        <DynamicCanvas />
      </div>
      <ZoomReadout />
    </div>
  )
}
