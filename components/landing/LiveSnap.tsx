"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"

import {
  artboardGuides,
  boxOf,
  solveSnap,
  type SnapLine,
} from "@/lib/composition"

/**
 * Snapping, demonstrated with the solver that does it.
 *
 * A card drifts across a miniature artboard and, as it approaches the centre,
 * is pulled onto it and the guide line appears — the same
 * `artboardGuides`/`solveSnap` pair the editor calls while you drag. The drift is
 * animated by this component, but the *snap* is not: the offset applied to the
 * card's position is whatever the solver returns, so what is on screen is the
 * arithmetic that runs in the app.
 *
 * The card is deliberately drawn short of the centre and then corrected, because
 * the corrected position is the thing worth seeing: a hand-drawn demo would drift
 * *near* the middle, and this snap is what makes it exact.
 */

const ARTBOARD = 300
const CARD_W = 118
const CARD_H = 54
/** Screen pixels the pull is felt within, matching the editor's default. */
const THRESHOLD_PX = 6

export default function LiveSnap() {
  const [offset, setOffset] = useState(0)
  const [guides, setGuides] = useState<SnapLine[]>([])
  const [snapped, setSnapped] = useState(false)
  const reduced = useReducedMotion()
  const raf = useRef(0)

  useEffect(() => {
    if (reduced) {
      // One frame, mid-drift, with the snap applied — the point still lands.
      const outcome = solveSnap(
        boxOf({
          left: 96,
          top: 0,
          width: CARD_W,
          height: CARD_H,
          originX: "left",
          originY: "top",
        }),
        artboardGuides(ARTBOARD, ARTBOARD),
        THRESHOLD_PX
      )
      setOffset(96 + outcome.dx)
      setGuides(outcome.guides)
      setSnapped(outcome.dx !== 0)
      return
    }

    const start = performance.now()
    const loop = (now: number) => {
      // One slow pass across the frame every eight seconds, easing at the ends
      // so it does not look like a machine sweeping.
      const t = ((now - start) / 8000) % 1
      const eased = (1 - Math.cos(t * Math.PI * 2)) / 2
      const raw = 30 + eased * (ARTBOARD - CARD_W - 60)

      const outcome = solveSnap(
        boxOf({
          left: raw,
          top: 0,
          width: CARD_W,
          height: CARD_H,
          originX: "left",
          originY: "top",
        }),
        artboardGuides(ARTBOARD, ARTBOARD),
        THRESHOLD_PX
      )

      setOffset(raw + outcome.dx)
      setGuides(outcome.guides)
      setSnapped(outcome.dx !== 0)
      raf.current = requestAnimationFrame(loop)
    }

    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [reduced])

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border border-module-dark-border bg-[#121218]"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* The artboard's thirds, drawn faintly so the guide has context. */}
        {[1, 2].map((n) => (
          <span
            key={`v${n}`}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-white/6"
            style={{ left: `${(n * 100) / 3}%` }}
          />
        ))}
        {[1, 2].map((n) => (
          <span
            key={`h${n}`}
            aria-hidden="true"
            className="absolute inset-x-0 h-px bg-white/6"
            style={{ top: `${(n * 100) / 3}%` }}
          />
        ))}

        {/* The centre line, in the accent, when something is on it. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-px transition-opacity duration-200"
          style={{
            background: "var(--primary)",
            opacity: snapped ? 1 : 0.22,
          }}
        />

        <div
          className="absolute left-0 flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg transition-colors duration-200"
          style={{
            width: CARD_W,
            height: CARD_H,
            transform: `translateX(${offset}px)`,
            top: `calc(50% - ${CARD_H / 2}px)`,
            borderColor: snapped
              ? "var(--primary)"
              : "var(--module-dark-border)",
            background: snapped
              ? "rgb(0 117 222 / 14%)"
              : "var(--module-dark-raised)",
          }}
        >
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: snapped ? "var(--primary)" : "#71717a" }}
          />
          <span className="truncate text-[11px] font-medium text-on-module">
            Quote
          </span>
        </div>
      </div>

      {/* The readout is the honest part: it says what the solver returned. */}
      <p className="text-center font-mono text-[11px] text-on-module-muted tabular-nums">
        {snapped
          ? `dx ${guides.length ? (CARD_W / 2 + offset - ARTBOARD / 2).toFixed(1) : "0.0"} → centred`
          : "free — outside the 6px pull"}
      </p>
    </div>
  )
}
