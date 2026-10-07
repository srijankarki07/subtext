"use client"

import { useEditorStore } from "@/store/useEditorStore"
import { safeArea } from "@/lib/composition"

/**
 * The composition guides drawn over the artboard.
 *
 * An SVG sized to the artboard in *logical* coordinates, with
 * `preserveAspectRatio="none"`: the element's box is already the artboard's box,
 * so logical coordinates map straight onto it and every guide can be expressed
 * in the same units the document uses. That is what keeps the lines on the
 * thirds when zoomed to 30% or to 400%.
 *
 * `vectorEffect="non-scaling-stroke"` keeps the stroke a hairline on screen
 * rather than scaling it with the artboard, so the grid does not become a set of
 * bars when zoomed in.
 *
 * Guides are chrome: `pointer-events-none` throughout, so they never intercept
 * a drag.
 */

const THIRDS_STROKE = "rgba(255,255,255,0.30)"
const CENTRE_STROKE = "rgba(255,255,255,0.42)"
const SAFE_STROKE = "rgba(255,255,255,0.34)"
/** The live snap lines, in the app's accent: the app is telling you something. */
const SNAP_STROKE = "var(--primary)"

export default function CompositionGuides() {
  const artboard = useEditorStore((s) => s.artboard)
  const guides = useEditorStore((s) => s.guides)
  const activeGuides = useEditorStore((s) => s.activeGuides)

  const { width, height } = artboard
  if (width <= 0 || height <= 0) return null

  const area = safeArea(width, height)
  const anyStatic = guides.thirds || guides.centre || guides.safeArea
  if (!anyStatic && activeGuides.length === 0) return null

  return (
    <svg
      aria-hidden="true"
      data-slot="composition-guides"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="z-canvas-overlay pointer-events-none absolute inset-0 h-full w-full"
    >
      {guides.thirds && (
        <g data-slot="thirds-guides">
          {[1, 2].map((n) => (
            <line
              key={`v${n}`}
              x1={(width * n) / 3}
              y1={0}
              x2={(width * n) / 3}
              y2={height}
              stroke={THIRDS_STROKE}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {[1, 2].map((n) => (
            <line
              key={`h${n}`}
              x1={0}
              y1={(height * n) / 3}
              x2={width}
              y2={(height * n) / 3}
              stroke={THIRDS_STROKE}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}

      {guides.centre && (
        <g data-slot="centre-guides">
          <line
            x1={width / 2}
            y1={0}
            x2={width / 2}
            y2={height}
            stroke={CENTRE_STROKE}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={CENTRE_STROKE}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}

      {guides.safeArea && (
        <rect
          data-slot="safe-area"
          x={area.left}
          y={area.top}
          width={area.width}
          height={area.height}
          fill="none"
          stroke={SAFE_STROKE}
          strokeWidth={1}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/*
        The lines that fired under the object being dragged. Drawn over the
        static guides, and only across the object plus a margin, so they read as
        belonging to it rather than as another grid line.
      */}
      <g data-slot="snap-guides">
        {activeGuides.map((guide, index) => (
          <line
            key={`${guide.axis}-${guide.position}-${index}`}
            x1={guide.axis === "x" ? guide.position : guide.from}
            y1={guide.axis === "x" ? guide.from : guide.position}
            x2={guide.axis === "x" ? guide.position : guide.to}
            y2={guide.axis === "x" ? guide.to : guide.position}
            stroke={SNAP_STROKE}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  )
}
