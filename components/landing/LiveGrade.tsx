"use client"

import { useEffect, useMemo, useState } from "react"

import { getDuotoneMatrix } from "@/lib/filters"
import { grainPreviewStyle } from "@/lib/grain"
import { Slider } from "@/components/ui/slider"
import type { GalleryItem } from "@/lib/gallery.generated"

/**
 * Grain and duotone, applied live with the editor's own maths.
 *
 * The page claims the effects are "composited into the file rather than faked
 * with an overlay", and this is where that claim has to hold up:
 *
 * - The grain is `grainPreviewStyle` from `lib/grain.ts` — the same tile, the
 *   same blend mode, the same amplitude the export composites. Not a CSS noise
 *   pattern that resembles it.
 * - The duotone is `getDuotoneMatrix` from `lib/filters.ts`, handed to an SVG
 *   `feColorMatrix`. Fabric's `ColorMatrix` filter and SVG's colour matrix are
 *   the same 4×5 transform in the same row-major order, so the numbers driving
 *   this image are literally the numbers driving the export.
 *
 * Both are driven by the reader, which is the point: a claim about an effect is
 * worth more when you can drag it.
 */

const RAMP = { light: "#FFD9A0", dark: "#2B1B4D" }

export default function LiveGrade({ item }: { item: GalleryItem }) {
  const [grain, setGrain] = useState(28)
  const [duotone, setDuotone] = useState(0)
  /*
   * The grain overlay is built from a canvas, which only exists in a browser.
   * Rendering it after mount keeps the server pass free of it and avoids the
   * hydration mismatch that returning a different style on each side would give.
   */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const matrix = useMemo(
    () => getDuotoneMatrix(RAMP.light, RAMP.dark, duotone),
    [duotone]
  )

  // A colour matrix at zero intensity would still tint the image, so the filter
  // is only attached once there is something to apply.
  const filterId = "subtext-duotone"
  const filter = duotone > 0 ? `url(#${filterId})` : undefined

  return (
    <div className="flex flex-col gap-4">
      <svg aria-hidden="true" className="absolute size-0">
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrix.join(" ")} />
        </filter>
      </svg>

      <div className="relative overflow-hidden rounded-xl border border-module-dark-border bg-[#121218]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/gallery/${item.file}`}
          width={item.width}
          height={item.height}
          alt={`${item.note} — shown with the grain and grade applied live.`}
          loading="lazy"
          className="block h-auto w-full"
          style={{ filter }}
        />
        {/* The grain preview, at the intensity the export would composite. */}
        {mounted && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={grainPreviewStyle(grain, 1)}
          />
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        {/* The editor's own slider, so the demo's controls look and behave like
            the ones the reader will meet in the app. */}
        <Slider
          label="Film grain"
          value={grain}
          min={0}
          max={100}
          onChange={setGrain}
        />
        <Slider
          label="Duotone"
          value={duotone}
          min={0}
          max={100}
          onChange={setDuotone}
        />

        <div className="flex items-center gap-2.5">
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
      </div>
    </div>
  )
}
