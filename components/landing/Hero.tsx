"use client"

import Link from "next/link"
import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/landing/Container"
import type { GalleryItem } from "@/lib/gallery.generated"

/**
 * The hero.
 *
 * The scroll behaviour is the brief's "scroll zoom": as the page moves, the
 * artwork module grows very slightly and drifts up, so the composition feels
 * like it is coming toward the reader rather than merely scrolling away. The
 * numbers are small on purpose — 1 → 1.06 and 60px of travel over a full
 * viewport — because a hero that visibly resizes while you read the copy above
 * it is a distraction, not a flourish.
 *
 * Everything here is driven by `useScroll` on a ref, so it scrubs with the
 * reader's own scrolling rather than playing on a timer, and it is disabled
 * outright under `prefers-reduced-motion`.
 */
export default function Hero({
  image,
  count,
}: {
  image: GalleryItem
  count: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.06])
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -56])
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const glowOpacity = useTransform(
    scrollYProgress,
    [0, 0.35, 1],
    [0.5, 0.75, 0.2]
  )

  return (
    <section className="relative pt-32 pb-4 sm:pt-40 lg:pt-44">
      {/*
        A single accent bloom behind the hero, drifting on scroll. It is the one
        place the accent appears at size, which is what keeps it reading as
        emphasis rather than as decoration.
      */}
      <motion.div
        aria-hidden="true"
        style={reduced ? undefined : { y: glowY, opacity: glowOpacity }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[520px] max-w-[900px] blur-[10px] [background:radial-gradient(60%_60%_at_50%_35%,var(--module-glow),transparent_70%)]"
      />

      <Container>
        <div className="max-w-4xl">
          <motion.p
            initial={reduced ? undefined : { opacity: 0, y: 10 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-[12px] font-medium text-[var(--text-secondary)] backdrop-blur-sm"
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
            />
            Free · no account
          </motion.p>

          <motion.h1
            initial={reduced ? undefined : { opacity: 0, y: 16 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-6 text-[42px] leading-[1.02] font-extrabold tracking-[-0.045em] text-balance sm:text-[60px] lg:text-[72px]"
          >
            Your words, on a photo,
            <br className="hidden sm:block" />{" "}
            {/*
              Not `whitespace-nowrap`. It kept the phrase on one line so the
              underline could sit under it, but at 360px the phrase is 335px
              inside a 320px column — which pushed the document 3px wide and gave
              the whole page a horizontal scrollbar on a phone. The rule is drawn
              from `sm` up instead, where the phrase fits on one line anyway.
            */}
            <span className="relative">
              actually readable
              {/*
                A hand-drawn-feeling rule under the payoff words. It draws itself
                in once, so the eye lands on the promise rather than the setup.
              */}
              <motion.svg
                aria-hidden="true"
                viewBox="0 0 320 12"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 hidden h-[10px] w-full text-primary sm:block"
                initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
                animate={reduced ? undefined : { pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
              >
                <motion.path
                  d="M2 8.5C60 4 130 2.5 318 5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </motion.svg>
            </span>
            .
          </motion.h1>

          <motion.p
            initial={reduced ? undefined : { opacity: 0, y: 12 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: 0.14,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-6 max-w-[38rem] text-[16px] leading-relaxed text-[var(--text-secondary)] sm:text-[17px]"
          >
            Subtext is a small editor for quotes over photographs. It sets the
            type, grades the picture, and — the part most tools skip — tells you
            how the text holds up against the hardest part of the background
            behind it.
          </motion.p>

          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 12 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button
              size="lg"
              className="h-11 rounded-full px-6 text-[14px]"
              nativeButton={false}
              render={<Link href="/editor" />}
            >
              Start a composition
            </Button>
            <a
              href="#gallery"
              className="rounded-full px-4 py-2.5 text-[14px] font-medium text-[var(--text-secondary)] transition-colors outline-none hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              See what it makes →
            </a>
          </motion.div>
        </div>

        {/* ------------------------------------------------- the hero artwork */}
        <div ref={ref} className="mt-14 sm:mt-16">
          <motion.figure
            style={reduced ? undefined : { scale, y }}
            className="relative overflow-hidden rounded-[26px] border border-border bg-module-dark shadow-[0_2px_4px_rgb(0_0_0/0.04),0_40px_80px_-40px_rgb(0_0_0/0.35)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/gallery/${image.file}`}
              width={image.width}
              height={image.height}
              alt={`A composition made in Subtext: a quote in a display serif over a dusk photograph, framed with widescreen bars.`}
              className="block h-auto w-full"
              fetchPriority="high"
            />
            <figcaption className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-module-dark-border bg-module-dark px-5 py-3 text-[12px] text-on-module-muted">
              <span className="font-medium text-on-module">
                {image.template}
              </span>
              <span aria-hidden="true">·</span>
              <span>{image.ratio}</span>
              <span aria-hidden="true">·</span>
              <span>
                one of {count} templates, exported straight from the editor
              </span>
            </figcaption>
          </motion.figure>
        </div>
      </Container>
    </section>
  )
}
