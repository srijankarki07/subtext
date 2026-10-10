"use client"

import { useRef, type ReactNode } from "react"
import { motion, useInView, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

/**
 * Fades and lifts its children as they come into view.
 *
 * Three decisions worth the words:
 *
 * - **Once.** The animation fires the first time and never again. Re-animating
 *   on scroll-back is the tell of a template, and it makes re-reading a section
 *   feel like it is fighting you.
 * - **Small numbers.** 14px of travel and a 0.5s ease. The brief asked for
 *   subtle: anything larger reads as a slideshow rather than as polish.
 * - **`useReducedMotion` is honoured, not assumed.** With the OS setting on, the
 *   content is simply there - no transition, no transform - which is what that
 *   preference is for.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-12% 0px -8% 0px" })
  const reduced = useReducedMotion()

  // Always a div. A polymorphic `as` was tempting for list items, but it makes
  // motion's ref types a union and the wrapper is not what carries the
  // semantics: a list keeps its own <li> and puts this inside it.
  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

/**
 * The same idea for a run of children, staggered rather than simultaneous.
 *
 * Used for grids, where a single fade for the whole block loses the sense of
 * items arriving one after another.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.06,
}: {
  children: ReactNode
  className?: string
  stagger?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-10% 0px -6% 0px" })
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "shown" : "hidden"}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** A child of {@link RevealGroup}. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        shown: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
