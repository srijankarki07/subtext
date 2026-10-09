"use client"

import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import type { GalleryItem } from "@/lib/gallery.generated"
import { cn } from "@/lib/utils"

/**
 * The gallery, with a filter row.
 *
 * The chips follow the reference: they let you narrow the grid by mood, which
 * turns a wall of pictures into something you can interrogate. Filtering
 * re-flows the columns with a short fade rather than a layout animation — a
 * masonry re-flow mid-flight is nauseating, and the fade covers the jump.
 *
 * `layout` is enabled on the items so the browser's own position transition
 * carries the re-flow instead of items teleporting.
 */

const ALL = "All"

export default function Gallery({ items }: { items: GalleryItem[] }) {
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(items.map((item) => item.category)))],
    [items]
  )
  const [active, setActive] = useState(ALL)
  const reduced = useReducedMotion()

  const shown = useMemo(
    () => (active === ALL ? items : items.filter((i) => i.category === active)),
    [active, items]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Filters, right-aligned on desktop like the reference. */}
      <div className="-mx-1 flex flex-wrap gap-2 overflow-x-auto px-1 pb-1 sm:justify-end">
        {categories.map((category) => {
          const selected = category === active
          return (
            <button
              key={category}
              type="button"
              aria-pressed={selected}
              onClick={() => setActive(category)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors outline-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-[var(--text-secondary)] hover:text-foreground"
              )}
            >
              {category}
            </button>
          )
        })}
      </div>

      <motion.div
        layout={!reduced}
        className="gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3"
      >
        {shown.map((item) => (
          <motion.figure
            key={item.file}
            layout={!reduced}
            initial={reduced ? undefined : { opacity: 0 }}
            animate={reduced ? undefined : { opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/gallery/${item.file}`}
              width={item.width}
              height={item.height}
              alt={`${item.note}. A composition made in Subtext with the ${item.template} template at ${item.ratio}.`}
              loading="lazy"
              className="block h-auto w-full"
            />
            <figcaption className="flex items-baseline justify-between gap-2 px-3.5 py-3">
              <span className="truncate text-[12px] font-semibold text-foreground">
                {item.template}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                {item.ratio}
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </div>
  )
}
