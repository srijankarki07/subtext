"use client"

import { useRef } from "react"

import { useTimedSequence } from "@/components/landing/playback/useTimedSequence"

import HeroDemo from "./HeroDemo"
import { FINAL, frameAt } from "./timeline"

/**
 * The hero demo, played on a clock.
 *
 * Nine and a half seconds through the four beats, then a beat and a half held on
 * the finished composition before it starts again. It loops because a hero that
 * plays once and freezes is a hero most visitors never see - it has finished
 * before they arrive.
 *
 * Everything else - the quantised clock, the resume-where-it-stopped behaviour,
 * stopping when off screen, and reduced motion - belongs to
 * `playback/useTimedSequence.ts`, which the other two demos on this page use as
 * well. All that is left here is the hero's own choice of frame.
 */

const DURATION_MS = 9600
const HOLD_MS = 1500

export default function HeroTimed() {
  const ref = useRef<HTMLDivElement>(null)
  const { progress, reduced } = useTimedSequence(ref, {
    durationMs: DURATION_MS,
    holdMs: HOLD_MS,
  })

  return (
    <div ref={ref}>
      <HeroDemo frame={reduced ? FINAL : frameAt(progress)} />
    </div>
  )
}
