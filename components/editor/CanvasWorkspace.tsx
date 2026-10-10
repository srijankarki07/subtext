"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef } from "react"
import { Maximize, Minus, Plus } from "lucide-react"

import { useEditorStore } from "@/store/useEditorStore"
import GuideControls from "@/components/editor/GuideControls"
import { cn } from "@/lib/utils"

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
 * This is the only dark surface in an otherwise light app, so the artwork stays
 * the hero (design doc §2).
 *
 * It owns the viewport measurement. A `ResizeObserver` reports the available
 * space to the store, which re-fits the artboard whenever the view is in fit
 * mode. Previously the fit scale was computed once when the aspect ratio
 * changed and never revisited, so opening the inspector, toggling a panel or
 * resizing the window cropped or off-centred the artboard with no way back -
 * and the zoom readout was a hardcoded "100%".
 *
 * The scroll container is `overflow-auto` rather than `overflow-hidden`, so
 * zooming past fit is reachable instead of clipped, and the artboard wrapper
 * uses `m-auto` rather than flex centring: centring an oversized child in a
 * scroll container makes the top and left overflow unreachable.
 */

function ZoomControls() {
  const zoom = useEditorStore((s) => s.zoom)
  const isFit = useEditorStore((s) => s.isFit)
  const artboard = useEditorStore((s) => s.artboard)
  const zoomBy = useEditorStore((s) => s.zoomBy)
  const fitToViewport = useEditorStore((s) => s.fitToViewport)

  const button =
    "flex size-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-on-workspace-muted)] outline-none transition-colors hover:bg-white/10 hover:text-[var(--color-on-workspace)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-on-workspace-muted)] disabled:pointer-events-none disabled:opacity-40"

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-[var(--color-on-workspace-hairline)] bg-[var(--color-workspace-raised)]/85 p-0.5 backdrop-blur-md lg:bottom-4">
      <button
        type="button"
        aria-label="Zoom out"
        className={button}
        onClick={() => zoomBy(1 / 1.2)}
      >
        <Minus size={13} aria-hidden="true" />
      </button>

      {/* The percentage doubles as a reset-to-fit control. Its accessible name
          is deliberately state-independent - a label that changes with the
          value is announced as a different control each time it changes. */}
      <button
        type="button"
        aria-label="Reset zoom to fit"
        title="Reset zoom to fit"
        onClick={fitToViewport}
        className={cn(
          button,
          "w-12 font-mono text-[11px] tabular-nums",
          isFit && "text-[var(--color-on-workspace)]"
        )}
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        type="button"
        aria-label="Zoom in"
        className={button}
        onClick={() => zoomBy(1.2)}
      >
        <Plus size={13} aria-hidden="true" />
      </button>

      <div className="mx-0.5 h-4 w-px bg-[var(--color-on-workspace-hairline)]" />

      <button
        type="button"
        aria-label="Fit artboard to the workspace"
        title="Fit artboard to the workspace"
        className={button}
        onClick={fitToViewport}
      >
        <Maximize size={13} aria-hidden="true" />
      </button>

      <GuideControls />

      <span className="px-1.5 font-mono text-[10px] text-[var(--color-on-workspace-faint)] tabular-nums">
        {artboard.width}×{artboard.height}
      </span>
    </div>
  )
}

export default function CanvasWorkspace() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const setViewport = useEditorStore((s) => s.setViewport)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const measure = () => {
      // clientWidth/Height include padding and exclude the scrollbar, so the
      // padding has to come off to get the space the artboard can actually
      // occupy - otherwise a fitted artboard is always a little too big and
      // the workspace shows a scrollbar at 100% fit.
      const styles = getComputedStyle(el)
      const width =
        el.clientWidth -
        parseFloat(styles.paddingLeft) -
        parseFloat(styles.paddingRight)
      const height =
        el.clientHeight -
        parseFloat(styles.paddingTop) -
        parseFloat(styles.paddingBottom)
      setViewport(Math.max(0, width), Math.max(0, height))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [setViewport])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-workspace">
      <div
        ref={viewportRef}
        className="custom-scrollbar-dark min-h-0 flex-1 overflow-auto p-3 sm:p-5 lg:p-8"
      >
        <DynamicCanvas />
      </div>
      <ZoomControls />
    </div>
  )
}
