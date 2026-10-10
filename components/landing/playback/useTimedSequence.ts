"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"

/**
 * The margin syntax `useInView` accepts.
 *
 * Derived from the hook rather than imported: motion does not re-export
 * `MarginType` from `motion/react`, and the alternative - reaching into
 * `framer-motion` directly - would be the only import in the repo that does. This
 * way the type is whatever the hook actually takes, and cannot drift from it.
 */
type ViewMargin = NonNullable<Parameters<typeof useInView>[1]>["margin"]

/**
 * The clock shared by the landing page's scripted demos.
 *
 * Three properties, and each of them is a fix for something the page got wrong
 * before this existed:
 *
 * - **Elapsed time is accumulated, not derived from a start timestamp.** A demo
 *   that pauses when scrolled away resumes where it stopped rather than jumping to
 *   wherever the clock got to. It also means a re-render for any other reason
 *   cannot restart the sequence - which is exactly what used to happen in the
 *   contrast demo, where applying a colour rebuilt a callback the effect depended
 *   on and snapped the drift back to the beginning.
 * - **It stops when off screen.** `LiveSnap` and `LiveContrast` both used to run
 *   their frame loop forever, whether or not anyone could see them.
 * - **Progress is quantised**, so a frame that would not move anything visible
 *   returns the value it already had and React skips the render.
 *
 * Reduced motion is reported rather than acted on: each demo decides which single
 * frame a reader who has asked for no motion is owed, and they are not the same
 * frame. The hero shows the finished composition; the contrast demo shows the
 * moment the score is failing, because that is the thing it exists to argue.
 */

/** Finer than anything on this page is legible at. */
const STEPS_PER_UNIT = 300

export interface TimedSequence {
  /** 0..1 through the sequence. Holds at 1 for `holdMs` before it repeats. */
  progress: number
  reduced: boolean
  inView: boolean
  /** True only while the sequence is actually running. */
  active: boolean
}

export function useTimedSequence(
  ref: React.RefObject<Element | null>,
  {
    durationMs,
    holdMs = 1500,
    stepsPerUnit = STEPS_PER_UNIT,
    margin = "-8% 0px -8% 0px",
  }: {
    durationMs: number
    /** How long the finished frame is held before the sequence repeats. */
    holdMs?: number
    stepsPerUnit?: number
    margin?: ViewMargin
  }
): TimedSequence {
  const reduced = useReducedMotion()
  const inView = useInView(ref, { margin })
  const active = !reduced && inView
  const progress = useTimedProgress(active, durationMs, holdMs, stepsPerUnit)

  return { progress, reduced: !!reduced, inView, active }
}

function useTimedProgress(
  active: boolean,
  durationMs: number,
  holdMs: number,
  stepsPerUnit: number
): number {
  const [progress, setProgress] = useState(0)
  const elapsed = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    if (!active) return

    let last = performance.now()
    const cycle = durationMs + holdMs

    const loop = (now: number) => {
      elapsed.current = (elapsed.current + (now - last)) % cycle
      last = now

      const next = Math.min(1, elapsed.current / durationMs)
      const quantised = Math.round(next * stepsPerUnit) / stepsPerUnit
      // Returning the current value when nothing moved lets React bail out of
      // the render entirely.
      setProgress((current) => (current === quantised ? current : quantised))

      raf.current = requestAnimationFrame(loop)
    }

    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [active, durationMs, holdMs, stepsPerUnit])

  return progress
}
