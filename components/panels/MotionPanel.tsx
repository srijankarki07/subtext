"use client"

import { useRef, useState } from "react"
import { Download, Loader2, Play, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Section } from "@/components/ui/section"
import { slugifyTitle } from "@/components/modals/ExportModal"
import {
  KEN_BURNS,
  MOTION_DURATIONS,
  MOTION_PRESETS,
  isMotionNeutral,
  type KenBurnsStrength,
  type MotionPreset,
} from "@/lib/motion"
import {
  exportMotionVideo,
  previewMotion,
  type VideoProgress,
} from "@/lib/videoExport"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * The Motion tool's panel.
 *
 * The composition is animated by the same frame function the exporter uses, so
 * Preview is not an approximation of the output - it is the output played back
 * on the artboard. Export runs that loop again and encodes it.
 */

const optionClass = (active: boolean) =>
  cn(
    "flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-colors outline-none",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
    active
      ? "border-primary/40 bg-primary/[0.06] text-foreground"
      : "border-border text-[var(--text-secondary)] hover:bg-subtle-hover"
  )

export default function MotionPanel() {
  const motion = useEditorStore((s) => s.motion)
  const setMotion = useEditorStore((s) => s.setMotion)
  const canvas = useEditorStore((s) => s.canvas)
  const documentTitle = useEditorStore((s) => s.documentTitle)
  const grainIntensity = useEditorStore((s) => s.grainIntensity)
  const setAlertDialog = useEditorStore((s) => s.setAlertDialog)

  const [phase, setPhase] = useState<"idle" | "previewing" | "exporting">(
    "idle"
  )
  const [progress, setProgress] = useState<VideoProgress | null>(null)
  const stopPreview = useRef(false)

  const busy = phase !== "idle"
  const width = Math.floor((canvas?.getWidth() ?? 1080) / 2) * 2
  const height = Math.floor((canvas?.getHeight() ?? 1080) / 2) * 2

  const handlePreview = async () => {
    if (!canvas || busy) return
    stopPreview.current = false
    setPhase("previewing")
    try {
      await previewMotion(canvas, motion, () => stopPreview.current)
    } finally {
      setPhase("idle")
    }
  }

  const handleExport = async () => {
    if (!canvas || busy) return
    setPhase("exporting")
    setProgress({ phase: "rendering", frame: 0, total: 0 })

    try {
      const result = await exportMotionVideo(
        canvas,
        motion,
        grainIntensity,
        setProgress
      )
      const url = URL.createObjectURL(result.blob)
      const link = document.createElement("a")
      link.download = `${slugifyTitle(documentTitle)}-motion.${result.format}`
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // Long enough for the download to start; the blob is then released.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (error) {
      console.error("Video export failed:", error)
      setAlertDialog({
        title: "Video export failed",
        message:
          "The video could not be encoded on this device. A shorter duration or a different browser may work.",
      })
    } finally {
      setProgress(null)
      setPhase("idle")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Entrance"
        description="Each text block enters with the selected animation, staggered."
      >
        <div className="grid grid-cols-2 gap-1.5">
          {MOTION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={`Use the ${preset.label} entrance`}
              aria-pressed={motion.preset === preset.id}
              onClick={() => setMotion({ preset: preset.id as MotionPreset })}
              className={optionClass(motion.preset === preset.id)}
            >
              <span className="text-[12px] font-medium">{preset.label}</span>
              <span className="text-[10px] leading-snug text-[var(--text-muted)]">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Ken Burns"
        description="A slow zoom into the photograph for the length of the clip."
      >
        <div className="flex gap-1.5">
          {KEN_BURNS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-label={`Ken Burns: ${option.label}`}
              aria-pressed={motion.kenBurns === option.id}
              onClick={() =>
                setMotion({ kenBurns: option.id as KenBurnsStrength })
              }
              className={cn(
                "flex-1 cursor-pointer rounded-lg border py-2 text-[12px] font-medium transition-colors outline-none",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                motion.kenBurns === option.id
                  ? "border-primary/40 bg-primary/[0.06] text-foreground"
                  : "border-border text-[var(--text-secondary)] hover:bg-subtle-hover"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Length">
        <div className="flex gap-1.5">
          {MOTION_DURATIONS.map((duration) => (
            <button
              key={duration}
              type="button"
              aria-label={`Make it ${duration} seconds`}
              aria-pressed={motion.duration === duration}
              onClick={() => setMotion({ duration })}
              className={cn(
                "flex-1 cursor-pointer rounded-lg border py-2 text-[12px] font-medium tabular-nums transition-colors outline-none",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                motion.duration === duration
                  ? "border-primary/40 bg-primary/[0.06] text-foreground"
                  : "border-border text-[var(--text-secondary)] hover:bg-subtle-hover"
              )}
            >
              {duration}s
            </button>
          ))}
        </div>
      </Section>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button
          variant="secondary"
          className="w-full"
          disabled={phase === "exporting"}
          onClick={() => {
            if (phase === "previewing") {
              stopPreview.current = true
              return
            }
            void handlePreview()
          }}
        >
          {phase === "previewing" ? (
            <>
              <Square size={13} aria-hidden="true" />
              Stop preview
            </>
          ) : (
            <>
              <Play size={14} aria-hidden="true" />
              Preview
            </>
          )}
        </Button>

        <Button
          className="w-full"
          disabled={busy}
          onClick={() => void handleExport()}
        >
          {phase === "exporting" ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              {progress && progress.total > 0
                ? `Rendering ${progress.frame} of ${progress.total}…`
                : "Preparing…"}
            </>
          ) : (
            <>
              <Download size={14} aria-hidden="true" />
              Export video
            </>
          )}
        </Button>

        <p className="text-center text-[11px] text-[var(--text-muted)]">
          MP4 · 30 fps · {width} × {height}
          {isMotionNeutral(motion) && " · a still, because both are off"}
        </p>
        <p className="text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
          Encoded on this device. No audio.
        </p>
      </div>
    </div>
  )
}
