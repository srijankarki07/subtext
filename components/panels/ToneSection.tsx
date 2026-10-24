"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import type { FabricImage } from "fabric"

import { AppleSlider } from "@/components/functions"
import { IconButton } from "@/components/ui/icon-button"
import { Section } from "@/components/ui/section"
import { histogramForImage, readTone } from "@/lib/imageTone"
import {
  NEUTRAL_TONE,
  addCurvePoint,
  buildToneLut,
  isNeutralTone,
  moveCurvePoint,
  normalizeCurve,
  removeCurvePoint,
  type Histogram,
  type ToneState,
} from "@/lib/tonal"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * The professional end of grading.
 *
 * The histogram sits behind the curve, the way it does in every colour-grading
 * tool: the graph is both the picture's tonal distribution and the control that
 * shapes it. Dragging a point updates the photograph live; the levels below are
 * the coarse move that the curve then refines.
 */

/** The curve's x range is divided into this many bars for the backdrop. */
const HISTOGRAM_BUCKETS = 64
const MAX_POINT_DISTANCE = 0.06

function histogramPath(histogram: Histogram | null): string {
  if (!histogram || histogram.peak === 0) return ""
  const perBucket = 256 / HISTOGRAM_BUCKETS
  const values = Array.from({ length: HISTOGRAM_BUCKETS }, (_, bucket) => {
    let total = 0
    for (let i = bucket * perBucket; i < (bucket + 1) * perBucket; i++) {
      total += histogram.luma[i]
    }
    return total
  })

  const max = Math.max(1, ...values)
  const bars: string[] = []
  bars.push("M0,100")
  values.forEach((value, index) => {
    // Square root, so a single spike does not flatten the rest of the graph.
    const height = Math.sqrt(value / max) * 88
    const left = (index / HISTOGRAM_BUCKETS) * 100
    const right = ((index + 1) / HISTOGRAM_BUCKETS) * 100
    bars.push(`L${left.toFixed(2)},${(100 - height).toFixed(2)}`)
    bars.push(`L${right.toFixed(2)},${(100 - height).toFixed(2)}`)
  })
  bars.push("L100,100 Z")
  return bars.join(" ")
}

function CurveEditor({
  tone,
  histogram,
  onChange,
}: {
  tone: ToneState
  histogram: Histogram | null
  onChange: (tone: ToneState) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  const curve = useMemo(() => normalizeCurve(tone.curve), [tone.curve])
  const lut = useMemo(() => buildToneLut(tone), [tone])

  const curvePath = useMemo(() => {
    const steps = 64
    const points: string[] = []
    for (let i = 0; i <= steps; i++) {
      const x = i / steps
      const y = lut[Math.round(x * 255)] / 255
      points.push(
        `${i === 0 ? "M" : "L"}${(x * 100).toFixed(2)},${((1 - y) * 100).toFixed(2)}`
      )
    }
    return points.join(" ")
  }, [lut])

  // Shared by pointer and double-click handlers, which carry different event
  // types but the same geometry.
  const local = useCallback(
    (event: {
      clientX: number
      clientY: number
      currentTarget: SVGSVGElement
    }) => {
      const rect = event.currentTarget.getBoundingClientRect()
      return {
        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
        y: Math.min(
          1,
          Math.max(0, 1 - (event.clientY - rect.top) / rect.height)
        ),
      }
    },
    []
  )

  const nearestPoint = (x: number, y: number) =>
    curve.findIndex(
      (point) => Math.hypot(point.x - x, point.y - y) < MAX_POINT_DISTANCE
    )

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = local(event)
    const found = nearestPoint(x, y)

    // The ends define the domain; their height is the levels' job.
    if (found === 0 || found === curve.length - 1) return

    if (found > 0) {
      setDragging(found)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    const next = addCurvePoint(curve, x, y)
    if (next.length === curve.length) return
    onChange({ ...tone, curve: next })

    const index = normalizeCurve(next).findIndex(
      (point) => Math.abs(point.x - x) < 0.001
    )
    if (index > 0 && index < next.length - 1) {
      setDragging(index)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragging === null) return
    const { x, y } = local(event)
    onChange({ ...tone, curve: moveCurvePoint(curve, dragging, x, y) })
  }

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragging(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <svg
      ref={svg}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label="Tone curve"
      className="h-[168px] w-full touch-none rounded-lg border border-border bg-subtle select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(event) => {
        const { x, y } = local(event)
        const found = nearestPoint(x, y)
        if (found > 0 && found < curve.length - 1) {
          onChange({ ...tone, curve: removeCurvePoint(curve, found) })
        }
      }}
    >
      {/* The photograph's distribution, behind the line that shapes it. */}
      <path
        d={histogramPath(histogram)}
        className="fill-[var(--text-muted)] opacity-25"
      />

      {[25, 50, 75].map((position) => (
        <g key={position} className="stroke-border" strokeWidth="0.4">
          <line
            x1={position}
            y1={0}
            x2={position}
            y2={100}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={position}
            x2={100}
            y2={position}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}

      <line
        x1={0}
        y1={100}
        x2={100}
        y2={0}
        className="stroke-border"
        strokeDasharray="1 2"
        vectorEffect="non-scaling-stroke"
      />

      <path
        d={curvePath}
        fill="none"
        className="stroke-primary"
        strokeWidth="1.8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {curve.map((point, index) => {
        const endpoint = index === 0 || index === curve.length - 1
        return (
          <circle
            key={`${index}-${point.x}`}
            cx={point.x * 100}
            cy={(1 - point.y) * 100}
            r={endpoint ? 1.8 : 2.6}
            className={
              endpoint
                ? "fill-[var(--text-muted)] stroke-card"
                : "fill-card stroke-primary"
            }
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}

export default function ToneSection() {
  const activeObject = useEditorStore((s) => s.activeObject)
  const canvas = useEditorStore((s) => s.canvas)
  const historyIndex = useEditorStore((s) => s.historyIndex)
  const applyTone = useEditorStore((s) => s.applyTone)

  const photo = useMemo(() => {
    const selected = activeObject as
      (FabricImage & { isEffect?: boolean }) | null
    if (selected?.type === "image" && !selected.isEffect) return selected

    return (canvas?.getObjects() ?? []).find(
      (object) =>
        object.type === "image" &&
        (object as { isEffect?: boolean }).isEffect !== true
    ) as FabricImage | undefined
  }, [activeObject, canvas])

  const [tone, setTone] = useState<ToneState>(NEUTRAL_TONE)
  const [histogram, setHistogram] = useState<Histogram | null>(null)

  // The filter is the source of truth, so a reload, an undo and a selection
  // change all read the same place instead of a second copy in the store.
  useEffect(() => {
    setTone(readTone(photo) ?? NEUTRAL_TONE)
    setHistogram(histogramForImage(photo))
  }, [photo, historyIndex])

  // Pointer moves arrive faster than a large photo can be re-filtered, so
  // applications are coalesced to one per frame.
  const pending = useRef<ToneState | null>(null)
  const frame = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    []
  )

  const schedule = (next: ToneState) => {
    setTone(next)
    pending.current = next
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const value = pending.current
      pending.current = null
      if (!value || !photo) return
      applyTone(value, photo)
      setHistogram(histogramForImage(photo))
    })
  }

  if (!photo) {
    return (
      <Section title="Tone" description="Levels, a curve and the histogram.">
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-[var(--text-muted)]">
          Add a photo to grade its tone.
        </p>
      </Section>
    )
  }

  const neutral = isNeutralTone(tone)

  return (
    <Section
      title="Tone"
      description="Drag the curve; the histogram shows what the photo holds."
      action={
        <IconButton
          icon={<RotateCcw size={13} />}
          label="Reset tone"
          size="sm"
          disabled={neutral}
          onClick={() => schedule(NEUTRAL_TONE)}
        />
      }
    >
      <CurveEditor tone={tone} histogram={histogram} onChange={schedule} />

      <AppleSlider
        label="Black point"
        min={0}
        max={0.6}
        step={0.01}
        value={tone.black}
        onChange={(value) =>
          schedule({ ...tone, black: Math.min(value, tone.white - 0.05) })
        }
      />
      <AppleSlider
        label="Gamma"
        min={0.3}
        max={2.5}
        step={0.05}
        value={tone.gamma}
        onChange={(value) => schedule({ ...tone, gamma: value })}
      />
      <AppleSlider
        label="White point"
        min={0.4}
        max={1}
        step={0.01}
        value={tone.white}
        onChange={(value) =>
          schedule({ ...tone, white: Math.max(value, tone.black + 0.05) })
        }
      />

      <p className="text-[11px] text-[var(--text-muted)]">
        {histogram
          ? `${histogram.total.toLocaleString()} px sampled · double-tap a point to remove it`
          : "No histogram yet."}
      </p>
    </Section>
  )
}
