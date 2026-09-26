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

/**
 * The inner frame's height, in pixels, and the only number the layout needs.
 *
 * The width is derived from it and the image's aspect ratio, so the frame is
 * exactly the shape of what it holds — which means `object-cover` has nothing to
 * crop. If these two ever disagree the image is quietly clipped, so the outer box
 * is sized from the same constant rather than from a class that could drift.
 */
const FRAME_HEIGHT = 300
const FRAME_PADDING = 8

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
      {/*
        The frame takes the shape of whatever it is showing.
        
        It used to be a fixed 4:3 box with the image `object-contain` inside, so a
        16:9 composition sat in a band of empty panel with margins top and bottom
        — the picture looked parked rather than presented. `object-cover` would
        have filled it by cropping, which is worse here: these are complete
        compositions, and cutting the edges off one to fit a template is exactly
        what the tool is for avoiding.
        
        So the frame morphs instead. Its *height* is fixed and only its width
        animates, which is what keeps the morph from reflowing everything below
        it every few seconds.
      */}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-xl border border-module-dark-border bg-[#0f0f13]"
        style={{ height: FRAME_HEIGHT + FRAME_PADDING * 2 }}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={current.file}
            initial={reduced ? undefined : { opacity: 0 }}
            animate={reduced ? undefined : { opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/*
              A blurred copy of the same frame fills the panel behind it.

              The frame keeps the image's exact shape so nothing is cropped — but
              that leaves the panel's sides empty for a portrait or square
              composition, and the section read as a picture floating in a black
              box. Scaling one copy to cover and blurring it fills that space with
              the composition's own colour, which is both how video players solve
              this and the only way to fill the container without cropping the
              artwork or distorting it.
            */}
            <motion.div
              key={`${current.file}-backdrop`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/gallery/${current.file}`}
                alt=""
                className="size-full scale-125 object-cover blur-2xl"
              />
            </motion.div>

            <motion.div
              initial={false}
              animate={{
                width: FRAME_HEIGHT * (current.width / current.height),
              }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-md shadow-2xl"
              style={{ height: FRAME_HEIGHT }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/gallery/${current.file}`}
                width={current.width}
                height={current.height}
                alt={`${current.note}. Made with the ${current.template} template.`}
                loading="lazy"
                className="size-full object-cover"
              />
            </motion.div>
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
