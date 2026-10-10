"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, TriangleAlert } from "lucide-react"

import { applyGrain } from "@/lib/grain"
import {
  analyseRegion,
  buildReport,
  rankColours,
  type ColourCandidate,
  type VisibilityReport,
} from "@/lib/visibility"
import { cn } from "@/lib/utils"
import { SequenceCaption } from "@/components/landing/playback/SequenceCaption"
import {
  buildSpans,
  easeInOut,
  stepAt,
  sub,
  type Step,
} from "@/components/landing/playback/timeline"
import { useTimedSequence } from "@/components/landing/playback/useTimedSequence"

/**
 * The readability engine, running for real on the page.
 *
 * This is not a recording or a mock-up of the panel. A canvas underneath is
 * painted with a backdrop, the pixels behind the quote are read back out of it,
 * and the numbers on the right come from the same `lib/visibility.ts` the editor
 * calls - `analyseRegion`, `buildReport`, `rankColours`.
 *
 * **The timeline moves the light, never the score.** That distinction is the
 * whole reason this demo is worth having. The page says out loud that this panel
 * is the engine reading pixels, and that stays true only for as long as
 * `getImageData` is in the loop below. Precomputing the numbers, or easing them
 * towards a target, would make this comment and the module's own body copy false.
 * Whatever else changes here, the score must still be read off the canvas.
 *
 * The sequence: the light sits away from the words and the score is comfortable;
 * it crosses them and the worst case collapses while the mean barely moves - that
 * gap is the argument; the top-ranked suggestion is applied, which is a real
 * `setFill` followed by a real re-measure; and the score climbs back with the
 * background unchanged. Then it repeats.
 *
 * Two deliberate costs:
 *
 * - The readback is throttled to ~7/s. `getImageData` copies megabytes per call
 *   at DPR 2, and nobody can read a number changing at 60Hz anyway. The canvas
 *   still repaints as often as the light moves; only the measurement is sparse.
 * - Reduced motion stops the light. It stops on the **worst-case** frame rather
 *   than the happy one - a reader who asked for no motion is owed the argument,
 *   not the setup.
 */

/**
 * The frame's starting size, and its pixel density.
 *
 * The canvas is not locked to this: it takes its backing-store size from its own
 * box on every redraw (see `resize`), so it can fill whatever the layout gives
 * it without being stretched. An earlier version pinned the box to this ratio and
 * set `height: 100%` on it, which fought the grid - the aspect ratio won the
 * width back and squeezed the readout panel into a column too narrow for its own
 * labels.
 */
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

/** The colour the quote starts in, and returns to at the top of each cycle. */
const DEFAULT_FILL = "#F6F6F7"

/** How often the pixels are read back, in ms. The repaint is not throttled. */
const MEASURE_INTERVAL_MS = 140

/** Where the light sits when the region behind the words is at its worst. */
const WORST_SWEEP = 0.5

type StepId = "measure" | "worst" | "apply" | "recovers"

const STEPS: readonly Step<StepId>[] = [
  {
    id: "measure",
    label: "Measure",
    caption:
      "The engine reads the pixels behind the words. With the light off to one side the score is comfortable.",
    weight: 18,
  },
  {
    id: "worst",
    label: "Worst case",
    caption:
      "The light crosses the words. The worst case collapses while the average hardly moves - the gap a checker that samples the mean cannot see.",
    weight: 34,
  },
  {
    id: "apply",
    label: "Apply",
    caption:
      "The top-ranked suggestion is applied to the quote. The background has not changed; only the text colour has.",
    weight: 20,
  },
  {
    id: "recovers",
    label: "Holds",
    caption:
      "The light has not moved and the score is holding. The colour was chosen for the background that is actually there, not for a flattering one.",
    weight: 28,
  },
]

const SPANS = buildSpans(STEPS)

/**
 * The light's position, 0..1, across the whole sequence.
 *
 * 0 is below the frame, 0.5 is directly behind the words. It rises during `worst`
 * and then **stops** - it does not keep travelling.
 *
 * That is deliberate, and it was measured rather than assumed. The colour the
 * engine picks at the worst moment is the right colour *for that background*: at
 * its brightest the region fails white and passes black. If the light then moved
 * on, the background would darken underneath a colour chosen for a bright one,
 * the score would fall again, and the "fix" would read as having failed. Holding
 * the light still means the recovery the sequence claims is a real one, and the
 * only thing that changes across `apply` and `recovers` is the colour of the
 * words.
 */
function sweepAt(progress: number): number {
  return 0.5 * easeInOut(sub(progress, SPANS.worst))
}

interface Frame {
  report: VisibilityReport
  candidates: ColourCandidate[]
}

/** Matches the backing store to the element's box, so the drawing has the right
 *  number of pixels for the space it is in. Returns false when nothing changed. */
function resize(canvas: HTMLCanvasElement): boolean {
  const width = Math.max(1, Math.round(canvas.clientWidth * DPR))
  const height = Math.max(1, Math.round(canvas.clientHeight * DPR))
  if (canvas.width === width && canvas.height === height) return false
  canvas.width = width
  canvas.height = height
  return true
}

/** Paints the backdrop: a base wash plus two light sources, at `sweep`. */
function draw(canvas: HTMLCanvasElement, sweep: number) {
  resize(canvas)
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height

  // Deep ground, a mid tone with real chroma, and a warm light - the same
  // construction as the generated backdrops, so the demo belongs to the gallery
  // rather than looking like a diagram of one. The first version of this painted
  // a muddy brown wash; depth comes from having an actual dark.
  const base = ctx.createLinearGradient(0, h, w * 0.55, 0)
  base.addColorStop(0, "#0B0A14")
  base.addColorStop(0.45, "#241A38")
  base.addColorStop(0.78, "#4A2050")
  base.addColorStop(1, "#140F22")
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // The bright source is the point: it passes through the quote's band and drags
  // the score down with it.
  //
  // It travels **vertically**, and that is not a stylistic choice. The quote is
  // two lines tall and 86% of the width wide, so a light moving horizontally can
  // never be clear of it - the measured region is always partly lit, the score
  // never recovers, and the verdict sits on TOO LOW for the whole loop. Rising
  // from below the frame to above it means both ends of the sweep leave the words
  // genuinely unlit, which is what makes the fall and the recovery both real.
  //
  // The radius is wide enough to cover the whole measured region, for the same
  // reason. With a tighter spot the region at its worst holds a lit patch *and*
  // unlit corners: white fails on the lit part and black fails on the dark part,
  // so no single colour can rescue it and the "apply" beat is theatre. Wide
  // enough, the region fails as a whole - and then one colour genuinely does fix
  // it, which is the thing this section is trying to show.
  const brightX = w * 0.44
  const brightY = h * (1.6 - sweep * 2.1)
  const bright = ctx.createRadialGradient(
    brightX,
    brightY,
    0,
    brightX,
    brightY,
    w * 0.85
  )
  bright.addColorStop(0, "rgba(255, 236, 206, 0.92)")
  bright.addColorStop(0.35, "rgba(246, 168, 120, 0.55)")
  bright.addColorStop(0.7, "rgba(199, 92, 128, 0.28)")
  bright.addColorStop(1, "rgba(150, 60, 120, 0)")
  ctx.fillStyle = bright
  ctx.fillRect(0, 0, w, h)

  // A cooler counterweight, moving the other way so the region is never uniform.
  const coolY = h * (0.2 + sweep * 0.7)
  const cool = ctx.createRadialGradient(
    w * 0.86,
    coolY,
    0,
    w * 0.86,
    coolY,
    w * 0.34
  )
  cool.addColorStop(0, "rgba(64, 156, 178, 0.55)")
  cool.addColorStop(1, "rgba(64, 156, 178, 0)")
  ctx.fillStyle = cool
  ctx.fillRect(0, 0, w, h)

  /*
   * Grain, composited by the editor's own `applyGrain` - the same tile, the same
   * `overlay` blend mode, the same amplitude the export uses. It is also the
   * cheap option: a per-pixel random pass here would have to run on every redraw
   * and would shimmer, where this draws one cached pattern.
   */
  applyGrain(canvas, 40)
}

/**
 * Paints, then reads the pixels back and reports on them.
 *
 * The readback is the point of this component. `analyseRegion`, `buildReport` and
 * `rankColours` are handed real bytes off a real canvas, which is what makes the
 * panel a measurement rather than a narration.
 */
function measureFrame(
  canvas: HTMLCanvasElement,
  quote: HTMLElement,
  sweep: number,
  fill: string
): Frame | null {
  draw(canvas, sweep)

  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null

  // The region the text actually crosses, in canvas pixels. The padding is there
  // because a glyph box is the ink, and the contrast a reader perceives includes
  // the shoulders of the letters either side of it.
  const canvasBox = canvas.getBoundingClientRect()
  const quoteBox = quote.getBoundingClientRect()
  const pad = 10
  const x = Math.max(
    0,
    Math.round((quoteBox.left - canvasBox.left - pad) * DPR)
  )
  const y = Math.max(0, Math.round((quoteBox.top - canvasBox.top - pad) * DPR))
  const w = Math.min(
    canvas.width - x,
    Math.round((quoteBox.width + pad * 2) * DPR)
  )
  const h = Math.min(
    canvas.height - y,
    Math.round((quoteBox.height + pad * 2) * DPR)
  )
  if (w <= 0 || h <= 0) return null

  const { data } = ctx.getImageData(x, y, w, h)
  // Stride 3: a few thousand samples is many more than the histogram needs, and
  // this runs on a timer.
  const region = analyseRegion(data, { stride: 3 })

  const report = buildReport({
    region,
    fill,
    fontSize: 26,
    fontWeight: 700,
    // The template shadow, so the demo shows the same mechanism the app does: a
    // soft shadow counts, and the engine says so.
    shadowColor: "rgba(0,0,0,0.5)",
    shadowBlur: 10,
    shadowOffset: 4,
  })

  return {
    report,
    // Excluded by value, not only by `origin`: the palette contains the same
    // white the demo starts with, and it was being offered back as a suggestion
    // to change white to white.
    candidates: rankColours(report, PALETTE, 5)
      .filter(
        (candidate) =>
          candidate.color.toLowerCase() !== fill.toLowerCase() &&
          candidate.origin !== "current"
      )
      .slice(0, 4),
  }
}

const DURATION_MS = 11000
const HOLD_MS = 1600

export default function LiveContrast() {
  const rootRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const quoteRef = useRef<HTMLDivElement>(null)
  const lastMeasure = useRef(0)
  const lastFill = useRef(DEFAULT_FILL)
  const applied = useRef(false)

  const [frame, setFrame] = useState<Frame | null>(null)
  /** Set by the sequence at the `apply` beat, or by the reader clicking a chip. */
  const [fill, setFill] = useState(DEFAULT_FILL)

  const { progress, reduced, active } = useTimedSequence(rootRef, {
    durationMs: DURATION_MS,
    holdMs: HOLD_MS,
  })

  const sweep = reduced ? WORST_SWEEP : sweepAt(progress)
  const activeStep = reduced ? "worst" : stepAt(progress, STEPS, SPANS)

  /*
   * Paint whenever the light moves; measure on a throttle. Holding `getImageData`
   * to ~7/s is what keeps this affordable on a marketing page, and the number on
   * screen is unreadable at 60Hz regardless.
   */
  useEffect(() => {
    const canvas = canvasRef.current
    const quote = quoteRef.current
    if (!canvas || !quote) return

    const now = performance.now()
    const fillChanged = lastFill.current !== fill
    if (!fillChanged && now - lastMeasure.current < MEASURE_INTERVAL_MS) {
      draw(canvas, sweep)
      return
    }

    lastFill.current = fill
    lastMeasure.current = now
    // A null means the box was not measurable yet - the panel keeps whatever it
    // last reported rather than blanking for a frame.
    const next = measureFrame(canvas, quote, sweep, fill)
    if (next) setFrame(next)
  }, [sweep, fill])

  /*
   * The one place the sequence changes something other than the light: it applies
   * the top-ranked suggestion as the `apply` beat opens, and puts the original
   * colour back at the top of the cycle so the story can be told again. Guarded by
   * a ref so it fires on the crossing, not on every frame of the beat.
   */
  useEffect(() => {
    if (!active) return

    if (activeStep === "measure") {
      applied.current = false
      setFill(DEFAULT_FILL)
      return
    }

    if (activeStep === "apply" && !applied.current) {
      const best = frame?.candidates[0]
      if (best) {
        applied.current = true
        setFill(best.color)
      }
    }
  }, [active, activeStep, frame])

  const report = frame?.report
  const failing = report?.badge === "FAIL"

  return (
    <figure ref={rootRef} className="flex flex-col gap-4">
      {/*
        The two panels are the same rectangle: `items-stretch` makes the frame
        fill whatever height the readout needs, rather than either being fixed.

        A fixed row height was the obvious way to do this and it clipped - the
        readout needs 466px at 1440 and 501px at 1024, because narrower columns
        wrap its labels onto more lines, so any single number is wrong at one end.
        Measured, not guessed: the row is as tall as its content and the frame
        follows.
      */}
      <div className="grid items-stretch gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
        {/* -------------------------------------------------------- the frame */}
        {/*
          `min-w-0` is load-bearing. A grid track is `min-width: auto` by default,
          so anything with a min-content width wider than its share drags the
          column out and crushes the other one - which is exactly what happened
          when the frame carried an `aspect-ratio` and `h-full` together: the ratio
          asked for 667px, the column gave it, and the readout was left a sliver.
        */}
        <div className="relative aspect-[16/10] min-w-0 lg:aspect-auto lg:h-full">
          {/*
            The frame is whatever shape the row is; the canvas matches it. On
            small screens there is no row height to fill, so it keeps a sensible
            ratio.
          */}
          <div className="relative size-full overflow-hidden rounded-2xl border border-module-dark-border">
            <canvas
              ref={canvasRef}
              width={CANVAS_W * DPR}
              height={CANVAS_H * DPR}
              aria-hidden="true"
              className="absolute inset-0 size-full"
            />

            {/*
              Real text in the product's own serif, positioned where the light
              crosses it. Its measured box is what the engine samples, so the words
              on screen and the pixels measured are the same thing.
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

        {/* ------------------------------------------------------ the readout */}
        <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-module-dark-border bg-module-dark-raised p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[40px] leading-none font-bold tracking-[-0.03em] tabular-nums">
                {report ? report.score : "-"}
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
              {failing ? "TOO LOW" : `${report?.badge ?? "-"} PASS`}
            </span>
          </div>

          <dl className="mt-5 flex flex-col gap-2.5 border-t border-module-dark-hairline pt-4">
            <Row
              label="Worst case"
              hint="the hardest part of the background"
              value={report ? `${report.worstRatio.toFixed(2)}:1` : "-"}
              swatch={report?.worstHex}
            />
            <Row
              label="Typical"
              hint="most of what the text crosses"
              value={report ? `${report.typicalRatio.toFixed(2)}:1` : "-"}
              swatch={report?.typicalHex}
            />
            <Row
              label="Area mean"
              hint="what an average-based checker reports"
              value={report ? `${report.meanRatio.toFixed(2)}:1` : "-"}
              swatch={report?.meanHex}
            />
          </dl>

          <p className="mt-4 border-t border-module-dark-hairline pt-4 text-[12px] leading-relaxed text-on-module-muted">
            Large type needs {report ? report.requiredRatio : "3"}:1. The mean
            stays comfortable while the worst case collapses - that gap is the
            whole reason this exists.
          </p>

          {frame && frame.candidates.length > 0 && (
            <div className="mt-auto pt-5">
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
                  // exists to catch - so the chips say which ones clear it
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
                  : `None of these clear ${report?.requiredRatio ?? 3}:1 on this background - that is when an outline or a shadow earns its keep. `}
                The demo applies the top-ranked one as it runs; pick any of them
                and the score recalculates from the same pixels.
              </p>
            </div>
          )}
        </div>
      </div>

      <SequenceCaption
        steps={STEPS}
        activeStep={activeStep}
        tone="dark"
        className="max-w-xl"
      />
    </figure>
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
