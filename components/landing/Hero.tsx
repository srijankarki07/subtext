"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/landing/Container"
import HeroTimed from "@/components/landing/hero/HeroTimed"

/**
 * The hero.
 *
 * The copy column is unchanged. What used to sit under it was a still export of
 * a composition with a small scroll-zoom on the frame; that is gone, replaced by
 * a demo that plays the editor doing the four things the product is for - setting
 * the words, grading the picture, turning the guides on, and opening the
 * comparison against the original photograph.
 *
 * The scroll-zoom was dropped rather than kept: it moved the artwork as the
 * reader scrolled, which is the same gesture one of the two demo variants uses to
 * drive its timeline, and the two read as the page fighting itself. Everything
 * else - the accent bloom, and the copy's own entrance - is as it was.
 *
 * The demo plays on a clock - see `components/landing/hero/HeroTimed.tsx`. A
 * scroll-driven variant was built alongside it and dropped: the scroll-zoom this
 * hero used to have already owned the same gesture, and two things moving on one
 * scroll read as the page fighting itself.
 */
export default function Hero() {
  const reduced = useReducedMotion()

  return (
    <section className="relative pt-32 pb-4 sm:pt-40 lg:pt-44">
      {/*
        A single accent bloom behind the hero, drifting on scroll. It is the one
        place the accent appears at size, which is what keeps it reading as
        emphasis rather than as decoration.
      */}
      <motion.div
        aria-hidden="true"
        initial={reduced ? undefined : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[520px] max-w-[900px] blur-[10px] [background:radial-gradient(60%_60%_at_50%_35%,var(--module-glow),transparent_70%)]"
      />

      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-16">
          <div className="max-w-2xl min-w-0">
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
              className="mt-6 text-[42px] leading-[1.02] font-extrabold tracking-[-0.045em] text-balance sm:text-[60px] lg:text-[64px]"
            >
              Your words, on a photo,
              <br className="hidden sm:block" />{" "}
              {/*
                Not `whitespace-nowrap`. It kept the phrase on one line so the
                underline could sit under it, but at 360px the phrase is 335px
                inside a 320px column - which pushed the document 3px wide and gave
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
              type, grades the picture, and - the part most tools skip - tells
              you how the text holds up against the hardest part of the
              background behind it.
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

          {/* ------------------------------------------------- the hero demo */}
          <div className="w-full min-w-0">
            <HeroTimed />
          </div>
        </div>
      </Container>
    </section>
  )
}
