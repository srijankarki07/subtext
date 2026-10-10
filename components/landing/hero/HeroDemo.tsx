"use client"

import { useEffect, useState } from "react"
import {
  Columns2,
  Grid2x2,
  Layers3,
  MonitorPlay,
  MousePointer2,
  Type,
} from "lucide-react"

import { artboardGuides, safeArea } from "@/lib/composition"
import { getDuotoneMatrix } from "@/lib/filters"
import { grainPreviewStyle } from "@/lib/grain"
import { cn } from "@/lib/utils"
import { SequenceCaption } from "@/components/landing/playback/SequenceCaption"

import {
  ATTRIBUTION,
  COMPARE_MAX,
  QUOTE,
  STEPS,
  type Frame,
  type StepId,
} from "./timeline"

/**
 * The demo's artboard, and the shell it is shown in.
 *
 * The shell is a mock - a top bar, a tool rail and a panel that are *shaped* like
 * the editor's without being it. The pixels on the artboard are not mocked: the
 * duotone is `getDuotoneMatrix` from `lib/filters.ts`, the grain is
 * `grainPreviewStyle` from `lib/grain.ts`, and the guides are positioned by
 * `artboardGuides` and `safeArea` from `lib/composition.ts`. So the page's rule -
 * that nothing here claims a capability the editor does not have - holds for
 * everything the reader is actually being shown. Only the *timing* is authored.
 *
 * `fabric` and the editor store are deliberately absent: none of the three `lib`
 * modules above imports anything, so the landing bundle does not grow a canvas
 * engine to play an animation.
 */

/** The editor's 9:16 preset, so guides are measured in the document's own space. */
const ARTBOARD_W = 1080
const ARTBOARD_H = 1920

/**
 * The duotone ramp. Warm highlights against an indigo shadow - the photograph is
 * a blue night scene with a white face on it, so this is the pair that has
 * somewhere to go rather than a tint applied to everything equally.
 */
const RAMP = { light: "#FFE0B0", dark: "#151B3A" }
const FILTER_ID = "hero-demo-duotone"

/**
 * The matrix is built once, at full strength, and never changes.
 *
 * Ramping the *intensity* would mean rewriting this filter's coefficients on
 * every frame, which re-runs an SVG colour matrix over the whole image ~100
 * times during the grade beat. It is also unnecessary: `lib/filters.ts` notes
 * that both the duotone and the identity are linear maps over RGB, so
 * interpolating their coefficients is exactly the same as cross-fading the two
 * results. Compositing a layer's `opacity` over the raw photograph underneath is
 * therefore the same picture by the module's own stated property - and it is one
 * constant attribute plus a GPU-composited opacity instead of a filter pass.
 */
const DUOTONE_MATRIX = getDuotoneMatrix(RAMP.light, RAMP.dark, 100)

/** Matches `components/editor/CompositionGuides.tsx` so the drawings agree. */
const THIRDS_STROKE = "rgba(255,255,255,0.30)"
const CENTRE_STROKE = "rgba(255,255,255,0.42)"
const SAFE_STROKE = "rgba(255,255,255,0.34)"

const TOOLS: { id: StepId | "select"; icon: typeof Type; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "quote", icon: Type, label: "Text" },
  { id: "grade", icon: MonitorPlay, label: "Cinema" },
  { id: "guides", icon: Grid2x2, label: "Guides" },
  { id: "compare", icon: Layers3, label: "Layers" },
]

export default function HeroDemo({ frame }: { frame: Frame }) {
  /*
   * The grain tile is drawn on a canvas, so it cannot be built while rendering
   * on the server. Rendering the overlay only after mount keeps the server pass
   * free of it - the same treatment `LiveGrade` gives it, and `grainPreviewStyle`
   * guards itself as well.
   */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const guides = artboardGuides(ARTBOARD_W, ARTBOARD_H)
  const area = safeArea(ARTBOARD_W, ARTBOARD_H)
  const comparing = frame.compare > 0.5
  /** How far the duotone layer has come up, 0..1 - see `DUOTONE_MATRIX`. */
  const gradeOpacity = frame.duotone / 100

  const guideOpacity = (kind: string) =>
    kind === "third" ? frame.thirds : kind === "centre" ? frame.centre : 0

  const step = STEPS.find((s) => s.id === frame.activeStep) ?? STEPS[0]

  return (
    <figure className="mx-auto flex w-fit max-w-full flex-col gap-4">
      {/* The colour matrix, as an SVG filter. Fabric's ColorMatrix and SVG's
          feColorMatrix are the same 4×5 row-major transform, so these are
          literally the numbers the editor would hand the canvas. */}
      <svg aria-hidden="true" className="absolute size-0">
        <filter id={FILTER_ID} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={DUOTONE_MATRIX.join(" ")} />
        </filter>
      </svg>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-[22px] border border-module-dark-border bg-module-dark text-on-module shadow-[0_2px_4px_rgb(0_0_0/0.04),0_40px_80px_-40px_rgb(0_0_0/0.5)]"
      >
        {/* ------------------------------------------------------ the top bar */}
        <div className="flex items-center gap-2.5 border-b border-module-dark-hairline px-3.5 py-2.5">
          <span className="flex size-6 items-center justify-center rounded-md border border-white/12 font-[family-name:var(--font-playfair)] text-[12px] text-on-module">
            S
          </span>
          <span className="truncate font-mono text-[11px] text-on-module-muted">
            Untitled composition
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ChromeChip
              icon={Grid2x2}
              label="Guides"
              active={frame.thirds > 0 || frame.centre > 0}
            />
            <ChromeChip icon={Columns2} label="Compare" active={comparing} />
          </div>
        </div>

        {/* --------------------------------------------------------- the body */}
        <div className="flex gap-3 p-3">
          {/* Tool rail. Hidden on the narrowest screens, where it is only noise. */}
          <div className="hidden shrink-0 flex-col gap-1 sm:flex">
            {TOOLS.map((tool) => (
              <span
                key={tool.id}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-colors",
                  tool.id === frame.activeStep
                    ? "bg-white/10 text-on-module"
                    : "text-on-module-muted/60"
                )}
              >
                <tool.icon size={14} />
              </span>
            ))}
          </div>

          {/* ------------------------------------------------------ the artboard */}
          <div
            className="relative w-[184px] shrink-0 overflow-hidden rounded-lg bg-[#0b0b0d] sm:w-[208px] lg:w-[236px]"
            style={{ aspectRatio: "9 / 16", containerType: "inline-size" }}
          >
            {/* The photograph as it was imported. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image.png"
              alt=""
              className="absolute inset-0 size-full object-cover"
            />

            {/*
              The artwork, clipped to everything right of the divider. Same idea
              as the editor's own compare overlay: the raw photograph underneath,
              the graded and typeset version on top with a `clip-path` window onto
              it, so the split is exact and nothing is re-rendered to draw it.
            */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 0 0 ${frame.compare}%)` }}
            >
              {/* The filter stays attached and the opacity does the work, so the
                  matrix is written once rather than every frame. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/image.png"
                alt=""
                className="absolute inset-0 size-full object-cover"
                style={{
                  filter: `url(#${FILTER_ID})`,
                  opacity: gradeOpacity,
                }}
              />

              {mounted && (
                <span
                  className="pointer-events-none absolute inset-0"
                  style={grainPreviewStyle(frame.grain, 1)}
                />
              )}

              {/* The words. Sized in container units so the composition keeps its
                  proportions at every width the hero is rendered at. */}
              <div className="absolute inset-x-[5%] top-[7.5%] text-center">
                {/*
                  The whole quote is rendered invisibly to hold the block's height,
                  with the typed text laid over it. Without that the paragraph
                  gains a line at a time and the composition above it shifts while
                  the words are still being set. No `text-balance` either:
                  re-balancing on every keystroke makes the line jump about.
                */}
                <p className="relative font-[family-name:var(--font-playfair)] text-[7.2cqw] leading-[1.06] font-semibold tracking-[-0.02em] text-white [text-shadow:0_1px_20px_rgb(0_0_0/0.6)]">
                  <span className="invisible" aria-hidden="true">
                    {QUOTE}
                  </span>
                  <span className="absolute inset-0">
                    {frame.quote}
                    {frame.quote.length < QUOTE.length && (
                      <span className="ml-[0.08em] inline-block h-[0.82em] w-[0.055em] translate-y-[0.04em] animate-pulse bg-white/85 align-baseline" />
                    )}
                  </span>
                </p>
                <p
                  className="mt-[2.4cqw] font-[family-name:var(--font-inter)] text-[2.7cqw] tracking-[0.2em] text-white/70 uppercase"
                  style={{ opacity: frame.attribution }}
                >
                  {ATTRIBUTION}
                </p>
              </div>
            </div>

            {/* Guides are editor chrome in the editor, drawn over the whole
                artboard rather than over the artwork - so they stay outside the
                clipped layer and read across both sides of the split. */}
            <svg
              viewBox={`0 0 ${ARTBOARD_W} ${ARTBOARD_H}`}
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 size-full"
            >
              {guides.map((guide, index) => {
                const opacity = guideOpacity(guide.kind)
                if (opacity <= 0) return null
                const common = {
                  stroke:
                    guide.kind === "centre" ? CENTRE_STROKE : THIRDS_STROKE,
                  strokeWidth: 1,
                  vectorEffect: "non-scaling-stroke" as const,
                  opacity,
                }
                return guide.axis === "x" ? (
                  <line
                    key={index}
                    x1={guide.position}
                    y1={0}
                    x2={guide.position}
                    y2={ARTBOARD_H}
                    {...common}
                  />
                ) : (
                  <line
                    key={index}
                    x1={0}
                    y1={guide.position}
                    x2={ARTBOARD_W}
                    y2={guide.position}
                    {...common}
                  />
                )
              })}

              {frame.safeArea > 0 && (
                <rect
                  x={area.left}
                  y={area.top}
                  width={area.width}
                  height={area.height}
                  fill="none"
                  stroke={SAFE_STROKE}
                  strokeWidth={1}
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                  opacity={frame.safeArea}
                />
              )}
            </svg>

            {/* The divider, and the two labels the editor uses. Deliberately not
                "before/after": the right side carries the grade *and* the type,
                and "before/after" would make the type look like a bug. */}
            {comparing && (
              <>
                <span
                  className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/85"
                  style={{ left: `${frame.compare}%` }}
                />
                <span
                  className="pointer-events-none absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[8px] font-semibold text-black shadow-lg"
                  style={{ left: `${frame.compare}%` }}
                >
                  ⇤⇥
                </span>
                {/* At the foot of the artboard rather than the head: the type is
                    set in the upper third, and the two labels sitting directly
                    above it crowded the quote. */}
                <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  Original photo
                </span>
                <span className="pointer-events-none absolute right-2 bottom-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  Your artwork
                </span>
              </>
            )}
          </div>

          {/* ------------------------------------------------------- the panel.
              Shows only the section the current step is working in, which is
              what a real pass through the editor looks like. */}
          <div className="hidden w-[176px] shrink-0 flex-col gap-3.5 lg:flex">
            {/* Full-strength muted, not a fraction of it: the contrast audit
                reads the specified colour and ignores alpha, so `/70` passes the
                check while actually compositing to about 4.4:1 - under AA for
                text this size, on a page about readable text. */}
            <span className="font-mono text-[10px] tracking-[0.14em] text-on-module-muted uppercase">
              {step.label}
            </span>
            <PanelForStep frame={frame} />
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- the caption.
          Page copy rather than chrome: it narrates the sequence for a reader who
          has just arrived, and names the step currently on screen. Shared with
          the other two scripted demos, in the `light` tone because this one sits
          on the page background rather than inside a dark module. */}
      <SequenceCaption
        steps={STEPS}
        activeStep={frame.activeStep}
        className="max-w-md"
      />
    </figure>
  )
}

/** A top-bar toggle, in the editor's shape. Not interactive: the demo drives it. */
function ChromeChip({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof Type
  label: string
  active: boolean
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
        active
          ? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-on-module"
          : "border-module-dark-border text-on-module-muted"
      )}
    >
      <Icon size={11} />
      {label}
    </span>
  )
}

/**
 * A read-out, not a control.
 *
 * The editor's own `Slider` is the wrong component here: its track is
 * `bg-black/10`, which is invisible against the near-black panel a dark editor
 * window is made of, and `disabled` would dim the thumb on every row. This is the
 * same geometry in colours that survive on dark, with `role="meter"` - the ARIA
 * role for a value that is displayed rather than dragged.
 */
function Meter({
  label,
  value,
  max,
  suffix = "",
}: {
  label: string
  value: number
  max: number
  suffix?: string
}) {
  const percent = Math.max(0, Math.min(1, value / max)) * 100
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-on-module-muted">{label}</span>
        <span className="font-mono text-[10px] text-on-module-muted tabular-nums">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <div className="relative h-1 w-full rounded-full bg-white/12">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--primary)]"
          style={{ width: `${percent}%` }}
        />
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white shadow-sm"
          style={{ left: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/** The panel body for whichever step is on screen. */
function PanelForStep({ frame }: { frame: Frame }) {
  if (frame.activeStep === "quote") {
    return (
      <>
        <Meter label="Size" value={58} max={200} />
        <Meter label="Weight" value={600} max={900} />
        <Meter label="Line height" value={1.06} max={3} />
      </>
    )
  }

  if (frame.activeStep === "grade") {
    return (
      <>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-on-module-muted">Duotone</span>
          <div className="flex items-center gap-2">
            <Swatch color={RAMP.light} name="Highlights" />
            <Swatch color={RAMP.dark} name="Shadows" />
          </div>
        </div>
        <Meter label="Intensity" value={frame.duotone} max={100} />
        <Meter label="Film grain" value={frame.grain} max={100} />
      </>
    )
  }

  if (frame.activeStep === "guides") {
    return (
      <div className="flex flex-col gap-2.5">
        {(
          [
            { label: "Rule of thirds", on: frame.thirds },
            { label: "Centre lines", on: frame.centre },
            { label: "Safe area", on: frame.safeArea },
          ] as const
        ).map((row) => (
          <span key={row.label} className="flex items-center gap-2">
            {/*
              Ticked as soon as the guide starts to appear, not halfway through
              its fade. The two are the same event: the row is the switch, so a
              guide visible on the artboard with an unticked box beside it reads
              as a fault rather than as a transition.
            */}
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded-[3px] border transition-colors",
                row.on > 0
                  ? "border-[var(--primary)] bg-[var(--primary)]"
                  : "border-white/25"
              )}
            >
              {row.on > 0 && (
                <svg viewBox="0 0 10 10" className="size-2.5 text-black">
                  <path
                    d="M2 5.2 4.1 7.3 8 3.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="text-[11px] text-on-module-muted">
              {row.label}
            </span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-module-dark-border px-2 py-1.5">
        <Columns2 size={11} className="text-on-module-muted" />
        <span className="text-[11px] text-on-module-muted">
          Compare with the original
        </span>
      </div>
      <Meter
        label="Divider"
        value={frame.compare}
        max={COMPARE_MAX}
        suffix="%"
      />
    </>
  )
}

function Swatch({ color, name }: { color: string; name: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-md border border-module-dark-border bg-module-dark-raised px-2 py-1">
      <span
        className="size-3 rounded-full ring-1 ring-white/20"
        style={{ background: color }}
      />
      <span className="font-mono text-[9px] text-on-module-muted">{name}</span>
    </span>
  )
}
