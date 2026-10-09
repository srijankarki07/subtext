"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import type { GalleryItem } from "@/lib/gallery.generated"

/**
 * The templates, cycling through real exports.
 *
 * Every frame here came out of the editor — they are the same files the gallery
 * shows, at the canvas size each template was designed for. Cycling them makes
 * the point that a template is a *whole* composition: type, grade, grain and
 * framing chosen together, not a font.
 *
 * It crossfades rather than slides. A slide implies a carousel you are meant to
 * operate; a crossfade reads as one surface changing its mind, which is what
 * browsing templates feels like.
 */

export default function TemplateShowcase({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || items.length < 2) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % items.length)
    }, 3800)
    return () => clearInterval(timer)
  }, [items.length, reduced])

  if (items.length === 0) return null
  const current = items[index]

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-module-dark-border bg-[#121218]">
        <AnimatePresence mode="sync">
          <motion.div
            key={current.file}
            initial={reduced ? undefined : { opacity: 0, scale: 1.015 }}
            animate={reduced ? undefined : { opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/gallery/${current.file}`}
              width={current.width}
              height={current.height}
              alt={`${current.note}. Made with the ${current.template} template.`}
              loading="lazy"
              className="max-h-full w-auto max-w-full rounded-md object-contain shadow-2xl"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <AnimatePresence mode="wait">
          <motion.span
            key={current.template}
            initial={reduced ? undefined : { opacity: 0, y: 6 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="truncate text-[13px] font-semibold text-on-module"
          >
            {current.template}
          </motion.span>
        </AnimatePresence>
        <span className="shrink-0 font-mono text-[11px] text-on-module-muted">
          {current.ratio} · {current.category}
        </span>
      </div>

      {/* Dots rather than a bar: they say how many there are, which is the whole
          claim being made here. */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {items.map((item, i) => (
          <span
            key={item.file}
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width: i === index ? 22 : 8,
              background:
                i === index ? "var(--primary)" : "rgb(255 255 255 / 0.18)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
