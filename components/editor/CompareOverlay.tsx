"use client"

import { useEffect, useRef, useState } from "react"
import type { FabricImage } from "fabric"

import { useEditorStore } from "@/store/useEditorStore"

/**
 * Before and after, side by side with a divider you can drag.
 *
 * "Before" is the photograph as it came out of the camera; "after" is the live
 * canvas with its grade, grain and effect layers. The two are stacked — the raw
 * photo underneath, the Fabric canvas on top clipped to the right of the divider
 * — so the split is a CSS `clip-path` over the real canvas rather than a second
 * rendering of the document. Nothing here re-implements the artwork, which means
 * it cannot disagree with it.
 *
 * It is only offered when there is a photo to compare: with no image there is
 * nothing that grading could have changed, and an empty comparison is worse than
 * no control.
 */

const START = 50

export default function CompareOverlay() {
  const canvas = useEditorStore((s) => s.canvas)
  const isComparing = useEditorStore((s) => s.isComparing)
  const setComparing = useEditorStore((s) => s.setComparing)
  const [position, setPosition] = useState(START)
  const [source, setSource] = useState<string | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  // The photograph's own pixels, straight from the object Fabric is rendering.
  useEffect(() => {
    if (!canvas) return
    const photo = canvas
      .getObjects()
      .find(
        (object) =>
          object.type === "image" &&
          !(object as { isEffect?: boolean }).isEffect
      ) as FabricImage | undefined

    const src = photo?.getSrc?.()
    setSource(typeof src === "string" && src.length > 0 ? src : null)
  }, [canvas, isComparing])

  /**
   * Starts a drag by attaching its listeners immediately.
   *
   * Not by setting a `dragging` flag and attaching them in an effect: React runs
   * effects after the render that the flag triggers, so a `pointermove` arriving
   * before that — which the editor's own harness demonstrated by dispatching both
   * in one task — is missed and the divider does not move at all. Listening from
   * the press is the usual pattern and has no such window.
   */
  const startDrag = (event: React.PointerEvent) => {
    event.preventDefault()
    const frame = frameRef.current
    if (!frame) return

    const move = (moveEvent: PointerEvent) => {
      const box = frame.getBoundingClientRect()
      const next = ((moveEvent.clientX - box.left) / box.width) * 100
      setPosition(Math.min(98, Math.max(2, next)))
    }
    const stop = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", stop)
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", stop)
  }

  // Escape leaves the comparison, like every other overlay in the editor.
  useEffect(() => {
    if (!isComparing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setComparing(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isComparing, setComparing])

  if (!isComparing || !source) return null

  return (
    <div
      ref={frameRef}
      data-slot="compare-overlay"
      className="z-canvas-overlay pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
    >
      {/* The photograph, ungraded, filling the artboard the way the canvas does. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
      />

      {/*
        The live canvas, clipped to everything right of the divider. `clip-path`
        on a wrapper around the canvas element is what keeps the split exact: the
        canvas is untouched, and this is only a window onto it.
      */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        aria-hidden="true"
      >
        <div className="pointer-events-none absolute inset-0">
          {canvas && <CanvasCopy canvas={canvas} />}
        </div>
      </div>

      {/* The handle. A wide invisible hit area around a thin visible rule. */}
      <div
        role="separator"
        aria-label="Before and after divider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onPointerDown={startDrag}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setPosition((p) => Math.max(2, p - 2))
          if (event.key === "ArrowRight")
            setPosition((p) => Math.min(98, p + 2))
        }}
        style={{ left: `${position}%` }}
        className="pointer-events-auto absolute inset-y-0 w-4 -translate-x-1/2 cursor-ew-resize outline-none"
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/85 shadow-[0_0_0_1px_rgb(0_0_0/0.25)]" />
        <span className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[9px] font-semibold text-black shadow-lg">
          ⇤⇥
        </span>
      </div>

      {/*
        Labelled precisely rather than "before" and "after".
        
        The left side is the photograph as it was imported and the right is the
        whole composition — grade, grain, effects and type. "Before/after" would
        invite the reading that the only difference is the grade, and the type
        appearing on one side would then look like a bug.
      */}
      <span className="pointer-events-none absolute top-2.5 left-3 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
        Original photo
      </span>
      <span className="pointer-events-none absolute top-2.5 right-3 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
        Your artwork
      </span>
    </div>
  )
}

/**
 * A second view of the same Fabric canvas.
 *
 * Fabric renders into a `<canvas>` element, and a canvas cannot be shown in two
 * places — so this draws the live canvas onto a surface of its own, once per
 * frame the editor renders. `drawImage` from the real canvas is the cheapest
 * honest way to do it, and it goes through the same renderer, so the "after"
 * side is the artwork rather than a copy of it.
 */
function CanvasCopy({
  canvas,
}: {
  canvas: NonNullable<ReturnType<typeof useEditorStore.getState>["canvas"]>
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let frame = 0
    const paint = () => {
      const target = ref.current
      const element = canvas.getElement()
      if (target && element) {
        if (target.width !== element.width) target.width = element.width
        if (target.height !== element.height) target.height = element.height
        const ctx = target.getContext("2d")
        ctx?.drawImage(element, 0, 0)
      }
      frame = requestAnimationFrame(paint)
    }
    frame = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(frame)
  }, [canvas])

  return <canvas ref={ref} className="absolute inset-0 size-full" />
}
