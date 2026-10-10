"use client"

import { useEffect, useRef, useState } from "react"

import { getDuotoneMatrix } from "@/lib/filters"
import { grainPreviewStyle } from "@/lib/grain"
import type { GalleryItem } from "@/lib/gallery.generated"
import { SequenceCaption } from "@/components/landing/playback/SequenceCaption"
import {
  buildSpans,
  clamp01,
  easeInOut,
  stepAt,
  sub,
  type Step,
} from "@/components/landing/playback/timeline"
import { useTimedSequence } from "@/components/landing/playback/useTimedSequence"

/**
 * Grain and duotone, applied live with the editor's own maths.
 *
 * The page claims the effects are "composited into the file rather than faked
 * with an overlay", and this is where that claim has to hold up:
 *
 * - The grain is `grainPreviewStyle` from `lib/grain.ts` - the same tile, the
 *   same blend mode, the same amplitude the export composites. Not a CSS noise
 *   pattern that resembles it.
 * - The duotone is `getDuotoneMatrix` from `lib/filters.ts`, handed to an SVG
 *   `feColorMatrix`. Fabric's `ColorMatrix` filter and SVG's colour matrix are
 *   the same 4×5 transform in the same row-major order, so the numbers driving
 *   this image are literally the numbers driving the export.
 *
 * **This used to be two sliders, and the reader drove it.** That was the point
 * then - "a claim about an effect is worth more when you can drag it" - and it is
 * worth recording why that changed rather than quietly dropping it. The section
 * now plays its own two beats on a timeline, like the hero and the readability
 * panel above it, because a reader who never touches a control was seeing a
 * still image and no demonstration at all. The cost is real: you can no longer
 * try a value yourself. The claim the copy makes was never about the dragging,
 * though, and the numbers on screen are still the editor's own.
 *
 * The duotone is a **fixed matrix plus a fading layer**, not a matrix rebuilt
 * every frame. `lib/filters.ts` records that the duotone and the identity are
 * both linear maps over RGB, so interpolating their coefficients is exactly the
 * same picture as cross-fading the two results - which means ramping `opacity`
 * over an ungraded copy underneath is faithful *and* costs one composited layer
 * instead of re-running an SVG filter over a 1920×1080 image every frame.
 */

const RAMP = { light: "#FFD9A0", dark: "#2B1B4D" }
const FILTER_ID = "subtext-duotone"

/**
 * Built once, at full strength, and never rewritten.
 *
 * Note this changes the zero case: the old sliders attached no filter at all at
 * `duotone === 0`, where this always attaches one and fades the layer out with
 * `opacity` instead. Same picture; one fewer branch to get wrong.
 */
const DUOTONE_MATRIX = getDuotoneMatrix(RAMP.light, RAMP.dark, 100)

/** Where the two beats settle. 28 is the amplitude the export uses by default. */
const GRAIN_SETTLED = 28

const DURATION_MS = 9000
const HOLD_MS = 1600

type StepId = "grain" | "grade"

const STEPS: readonly Step<StepId>[] = [
  {
    id: "grain",
    label: "Grain",
    caption:
      "The grain tile lands first, at the amplitude the export composites - a generated texture, not a filter, which is why 28 in the file means what it does on screen.",
    weight: 46,
  },
  {
    id: "grade",
    label: "Grade",
    caption:
      "Then the duotone: one 4×5 matrix mapping the picture's luminance between a highlight and a shadow colour, which is the same transform the canvas applies.",
    weight: 54,
  },
]

const SPANS = buildSpans(STEPS)

interface Frame {
  grain: number
  duotone: number
}

function frameAt(progress: number): Frame {
  const p = clamp01(progress)
  return {
    grain: easeInOut(sub(p, SPANS.grain)) * GRAIN_SETTLED,
    duotone: easeInOut(sub(p, SPANS.grade)),
  }
}

/** The finished look, for a reader who has asked for no motion. */
const FINAL: Frame = frameAt(1)

export default function LiveGrade({ item }: { item: GalleryItem }) {
  const rootRef = useRef<HTMLElement>(null)
  /*
   * The grain overlay is built from a canvas, which only exists in a browser.
   * Rendering it after mount keeps the server pass free of it and avoids the
   * hydration mismatch that returning a different style on each side would give.
   */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { progress, reduced } = useTimedSequence(rootRef, {
    durationMs: DURATION_MS,
    holdMs: HOLD_MS,
  })

  const frame = reduced ? FINAL : frameAt(progress)
  const activeStep = reduced ? "grade" : stepAt(progress, STEPS, SPANS)

  return (
    <figure ref={rootRef} className="flex flex-col gap-4">
      <svg aria-hidden="true" className="absolute size-0">
        <filter id={FILTER_ID} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={DUOTONE_MATRIX.join(" ")} />
        </filter>
      </svg>

      <div className="relative overflow-hidden rounded-xl border border-module-dark-border bg-[#121218]">
        {/* The photograph as it came out of the editor. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/gallery/${item.file}`}
          width={item.width}
          height={item.height}
          alt={`${item.note} - shown with the grain and grade applied live.`}
          loading="lazy"
          className="block h-auto w-full"
        />

        {/*
          The graded copy, sitting exactly on top of it and faded in by the
          timeline. `absolute inset-0` over a container whose height is the image's
          own box means the two are pixel-aligned; the filter is on this layer and
          the fade is its `opacity`, so the matrix is never rewritten.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/gallery/${item.file}`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          style={{
            filter: `url(#${FILTER_ID})`,
            opacity: frame.duotone,
          }}
        />

        {/* The grain preview, at the intensity the export would composite. */}
        {mounted && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={grainPreviewStyle(frame.grain, 1)}
          />
        )}
      </div>

      {/*
        Read-outs rather than controls: the sequence is setting these and there is
        nothing for a reader to drag any more, so they say what is being applied
        instead of pretending to be adjustable.
      */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Readout label="Film grain" value={Math.round(frame.grain)} />
        <Readout
          label="Duotone"
          value={Math.round(frame.duotone * 100)}
          suffix="%"
        />
        <span className="flex items-center gap-1.5 rounded-md border border-module-dark-border bg-module-dark px-2 py-1">
          <span
            aria-hidden="true"
            className="size-3 rounded-full ring-1 ring-white/20"
            style={{ background: RAMP.light }}
          />
          <span className="font-mono text-[10px] text-on-module-muted">
            highlights
          </span>
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-module-dark-border bg-module-dark px-2 py-1">
          <span
            aria-hidden="true"
            className="size-3 rounded-full ring-1 ring-white/20"
            style={{ background: RAMP.dark }}
          />
          <span className="font-mono text-[10px] text-on-module-muted">
            shadows
          </span>
        </span>
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

function Readout({
  label,
  value,
  suffix = "",
}: {
  label: string
  value: number
  suffix?: string
}) {
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex items-center gap-2 rounded-md border border-module-dark-border bg-module-dark px-2 py-1"
    >
      <span className="font-mono text-[10px] text-on-module-muted">
        {label}
      </span>
      <span className="font-mono text-[10px] text-on-module tabular-nums">
        {value}
        {suffix}
      </span>
    </span>
  )
}
