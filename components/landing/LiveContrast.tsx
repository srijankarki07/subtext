"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, TriangleAlert } from "lucide-react"

import {
  analyseRegion,
  buildReport,
  rankColours,
  type ColourCandidate,
  type VisibilityReport,
} from "@/lib/visibility"
import { cn } from "@/lib/utils"

/**
 * The readability engine, running for real on the page.
 *
 * This is not a recording or a mock-up of the panel. A canvas underneath is
 * painted with a drifting backdrop, the pixels behind the quote are read back
 * out of it, and the numbers on the right come from the same
 * `lib/visibility.ts` the editor calls — `analyseRegion`, `buildReport`,
 * `rankColours`. The backdrop is animated *because* that is the argument: the
 * score falls as a bright patch drifts under the words, which is precisely the
 * failure a checker that samples the average cannot see.
 *
 * Two deliberate costs:
 *
 * - The drift is slow (about fourteen seconds a cycle) and the readback is
 *   throttled to ~7/s. A `getImageData` on every frame would be a hidden tax on
 *   a marketing page for a number nobody can read at 60Hz anyway.
 * - `useReducedMotion` stops the drift and computes one frame. The demo still
 *   demonstrates — it just does not move.
 */

/** Roughly a 16:10 frame at 2× for crisp text and swatches. */
const CANVAS_W = 340
const CANVAS_H = 214
const DPR = 2

const PALETTE = [
  "#0B1020",
  "#2A1F3D",
  "#7A4A5C",
  "#E8B073",
  "#F6F6F7",
  "#0E0E10",
]

/** The quote the demo measures. Short, so it sits beside the panel. */
const QUOTE = {
  text: "Somewhere, something incredible is waiting to be known.",
  author: "CARL SAGAN",
}

interface Frame {
  report: VisibilityReport
  candidates: ColourCandidate[]
}

export default function LiveContrast() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const quoteRef = useRef<HTMLDivElement>(null)
  const phaseRef = useRef(0)
  const [frame, setFrame] = useState<Frame | null>(null)
  /** Applied by clicking a suggestion, so the demo can show the fix landing. */
  const [fill, setFill] = useState("#F6F6F7")

  const measure = useCallback(
    (draw: (t: number) => void, t: number) => {
      const canvas = canvasRef.current
      const quote = quoteRef.current
      if (!canvas || !quote) return

      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return

      draw(t)

      // The region the text actually crosses, in canvas pixels. The padding is
      // there because a glyph box is the ink, and the contrast a reader perceives
      // includes the shoulders of the letters either side of it.
      const canvasBox = canvas.getBoundingClientRect()
      const quoteBox = quote.getBoundingClientRect()
      const pad = 10
      const x = Math.max(
        0,
        Math.round((quoteBox.left - canvasBox.left - pad) * DPR)
      )
      const y = Math.max(
        0,
        Math.round((quoteBox.top - canvasBox.top - pad) * DPR)
      )
      const w = Math.min(
        canvas.width - x,
        Math.round((quoteBox.width + pad * 2) * DPR)
      )
      const h = Math.min(
        canvas.height - y,
        Math.round((quoteBox.height + pad * 2) * DPR)
      )
      if (w <= 0 || h <= 0) return

      const { data } = ctx.getImageData(x, y, w, h)
      // Stride 3: a few thousand samples is many more than the histogram needs,
      // and this runs on a timer.
      const region = analyseRegion(data, { stride: 3 })

      const report = buildReport({
        region,
        fill,
        fontSize: 26,
        fontWeight: 700,
        // The template shadow, so the demo shows the same mechanism the app does:
        // a soft shadow counts, and the engine says so.
        shadowColor: "rgba(0,0,0,0.5)",
        shadowBlur: 10,
        shadowOffset: 4,
      })

      setFrame({
        report,
        // Excluded by value, not only by `origin`: the palette contains the same
        // white the demo starts with, and it was being offered back as a
        // suggestion to change white to white.
        candidates: rankColours(report, PALETTE, 5)
          .filter(
            (candidate) =>
              candidate.color.toLowerCase() !== fill.toLowerCase() &&
              candidate.origin !== "current"
          )
          .slice(0, 4),
      })
    },
    [fill]
  )

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    /** Paints the drifting backdrop: a base wash plus two moving light sources. */
    const draw = (t: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return

      const w = canvas.width
      const h = canvas.height

      const base = ctx.createLinearGradient(0, 0, w * 0.4, h)
      base.addColorStop(0, "#14121F")
      base.addColorStop(0.55, "#3A2740")
      base.addColorStop(1, "#101018")
      ctx.fillStyle = base
      ctx.fillRect(0, 0, w, h)

      // The bright source is the point: it sweeps through the quote's band and
      // drags the score down with it.
      const sweep = (Math.sin(t * 0.45) + 1) / 2
      const bright = ctx.createRadialGradient(
        w * (0.18 + sweep * 0.66),
        h * 0.44,
        0,
        w * (0.18 + sweep * 0.66),
        h * 0.44,
        w * 0.46
      )
      bright.addColorStop(0, "rgba(255, 233, 196, 0.95)")
      bright.addColorStop(0.5, "rgba(224, 168, 120, 0.45)")
      bright.addColorStop(1, "rgba(224, 168, 120, 0)")
      ctx.fillStyle = bright
      ctx.fillRect(0, 0, w, h)

      // A cooler counterweight, so the region is never uniform.
      const cool = ctx.createRadialGradient(
        w * 0.86,
        h * (0.9 - sweep * 0.5),
        0,
        w * 0.86,
        h * (0.9 - sweep * 0.5),
        w * 0.34
      )
      cool.addColorStop(0, "rgba(74, 118, 178, 0.5)")
      cool.addColorStop(1, "rgba(74, 118, 178, 0)")
      ctx.fillStyle = cool
      ctx.fillRect(0, 0, w, h)
    }

    if (reduced) {
      measure(draw, 0.5)
      return
    }

    let raf = 0
    let lastCompute = 0
    const start = performance.now()

    const loop = (now: number) => {
      const t = (now - start) / 1000
      // Redraw smoothly, recompute sparingly: the drift reads as motion either
      // way, and the readback is the expensive half.
      if (now - lastCompute > 140) {
        lastCompute = now
        phaseRef.current = t
        measure(draw, t)
      }
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [measure])

  const report = frame?.report
  const failing = report?.badge === "FAIL"

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
      {/* ---------------------------------------------------------- the frame */}
      <div className="relative">
        <div
          className="relative overflow-hidden rounded-2xl border border-module-dark-border"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W * DPR}
            height={CANVAS_H * DPR}
            aria-hidden="true"
            className="absolute inset-0 size-full"
          />

          {/*
            Real text in the product's own serif, positioned where the drifting
            light will cross it. Its measured box is what the engine samples, so
            the words on screen and the pixels measured are the same thing.
          */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
            <div
              ref={quoteRef}
              className="max-w-[86%] text-center"
              style={{ color: fill }}
            >
              <p
                className="text-[19px] leading-tight font-bold text-balance"
                style={{
                  fontFamily: "var(--font-playfair)",
                  textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                }}
              >
                “{QUOTE.text}”
              </p>
              <p className="mt-2 font-mono text-[9px] tracking-[0.2em]">
                {QUOTE.author}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- the readout */}
      <div className="rounded-2xl border border-module-dark-border bg-module-dark-raised p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[40px] leading-none font-bold tracking-[-0.03em] tabular-nums">
              {report ? report.score : "—"}
              <span className="ml-0.5 text-[15px] font-medium text-on-module-muted">
                /100
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-on-module-muted">
              Estimated readability
            </p>
          </div>

          {/* Never colour-only: an icon and a word carry the verdict too. */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold",
              failing
                ? "bg-red-500/15 text-red-300"
                : "bg-emerald-500/15 text-emerald-300"
            )}
          >
            {failing ? (
              <TriangleAlert size={11} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={11} aria-hidden="true" />
            )}
            {failing ? "TOO LOW" : `${report?.badge ?? "—"} PASS`}
          </span>
        </div>

        <dl className="mt-5 flex flex-col gap-2.5 border-t border-module-dark-hairline pt-4">
          <Row
            label="Worst case"
            hint="the hardest part of the background"
            value={report ? `${report.worstRatio.toFixed(2)}:1` : "—"}
            swatch={report?.worstHex}
          />
          <Row
            label="Typical"
            hint="most of what the text crosses"
            value={report ? `${report.typicalRatio.toFixed(2)}:1` : "—"}
            swatch={report?.typicalHex}
          />
          <Row
            label="Area mean"
            hint="what an average-based checker reports"
            value={report ? `${report.meanRatio.toFixed(2)}:1` : "—"}
            swatch={report?.meanHex}
          />
        </dl>

        <p className="mt-4 border-t border-module-dark-hairline pt-4 text-[12px] leading-relaxed text-on-module-muted">
          Large type needs {report ? report.requiredRatio : "3"}:1. The mean
          stays comfortable while the worst case collapses — that gap is the
          whole reason this exists.
        </p>

        {frame && frame.candidates.length > 0 && (
          <div className="mt-5">
            <p className="text-[12px] font-medium text-on-module">
              Suggested colours
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {frame.candidates.map((candidate) => {
                // Ranked, not guaranteed. `rankColours` orders candidates by
                // predicted score and returns the best available; whether one
                // actually clears the bar depends on how bad the background is.
                // The first version of this label claimed they "would pass"
                // while listing 2.0:1, which is the exact dishonesty the app
                // exists to catch — so the chips say which ones clear it
                // instead of asserting that all of them do.
                const clears =
                  report !== undefined &&
                  candidate.ratio >= report.requiredRatio
                return (
                  <button
                    key={candidate.color}
                    type="button"
                    onClick={() => setFill(candidate.color)}
                    aria-label={`Use ${candidate.color}, ${candidate.ratio.toFixed(1)} to 1${clears ? ", clears the bar" : ""}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border bg-module-dark px-2.5 py-1.5 transition-colors outline-none hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      clears
                        ? "border-emerald-400/40"
                        : "border-module-dark-border opacity-70"
                    )}
                  >
                    <span
                      className="size-3.5 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: candidate.color }}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "font-mono text-[10px] tabular-nums",
                        clears ? "text-emerald-300" : "text-on-module-muted"
                      )}
                    >
                      {candidate.ratio.toFixed(1)}:1
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-on-module-muted">
              {frame.candidates.some(
                (c) => report !== undefined && c.ratio >= report.requiredRatio
              )
                ? `Outlined chips clear the ${report?.requiredRatio ?? 3}:1 this text needs. `
                : `None of these clear ${report?.requiredRatio ?? 3}:1 on this background — that is when an outline or a shadow earns its keep. `}
              Pick one to apply it; the score recalculates from the same pixels.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  hint,
  value,
  swatch,
}: {
  label: string
  hint: string
  value: string
  swatch?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="min-w-0">
        <span className="flex items-center gap-2 text-[12px] font-medium text-on-module">
          {swatch && (
            <span
              className="size-3 shrink-0 rounded-[3px] ring-1 ring-white/20"
              style={{ backgroundColor: swatch }}
              aria-hidden="true"
            />
          )}
          {label}
        </span>
        <span className="mt-0.5 block text-[10px] text-on-module-muted">
          {hint}
        </span>
      </dt>
      <dd className="shrink-0 font-mono text-[12px] text-on-module tabular-nums">
        {value}
      </dd>
    </div>
  )
}
