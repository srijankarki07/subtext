"use client"

import { AlertTriangle, CheckCircle2, Droplet, PaintBucket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Section } from "@/components/ui/section"
import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * Visibility and colour.
 *
 * The contrast score is the product's reason to exist, so it gets the room
 * rather than being one row among many. Structural note: the previous version
 * applied the colour change without calling `saveHistoryState`, so clicking a
 * palette swatch could not be undone — that call is now made, matching every
 * other text-style path.
 */
export default function ColorPanel() {
  const activeObject = useEditorStore((s) => s.activeObject)
  const contrastStats = useEditorStore((s) => s.contrastStats)
  const imagePalette = useEditorStore((s) => s.imagePalette)
  const autoColorText = useEditorStore((s) => s.autoColorText)

  if (!activeObject || activeObject.type !== "i-text") {
    return (
      <p className="text-[12px] text-[var(--text-muted)]">
        Select a text layer to see its visibility.
      </p>
    )
  }

  const applyColor = (hex: string) => {
    const store = useEditorStore.getState()
    if (!store.canvas || !store.activeObject) return
    store.activeObject.set("fill", hex)
    store.canvas.requestRenderAll()
    store.calculateContrast()
    store.saveHistoryState(`Recolour text ${hex}`)
  }

  const failing = contrastStats?.badge === "FAIL"

  return (
    <div className="flex flex-col gap-6">
      <Section title="Visibility">
        {!contrastStats ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-[12px] text-[var(--text-muted)]">
            Move the text over the image to measure its contrast.
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[32px] leading-none font-light tracking-tight text-foreground tabular-nums">
                  {contrastStats.score}
                  <span className="ml-1 text-[14px] text-[var(--text-muted)]">
                    /100
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  Estimated readability
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {/* Status is never colour-only: icon + word + ratio. */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                    failing
                      ? "bg-destructive/10 text-destructive"
                      : "bg-emerald-600/10 text-emerald-700"
                  )}
                >
                  {failing ? (
                    <AlertTriangle size={10} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={10} aria-hidden="true" />
                  )}
                  {failing ? "LOW" : `${contrastStats.badge} PASS`}
                </span>
                <span className="text-[12px] text-[var(--text-secondary)] tabular-nums">
                  {contrastStats.ratio.toFixed(2)}:1
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                  Background
                  <span
                    className="size-3 rounded-full border border-black/15"
                    style={{ backgroundColor: contrastStats.bgColor }}
                  />
                  <span className="font-mono">{contrastStats.bgColor}</span>
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={autoColorText}
            >
              <PaintBucket size={14} />
              Smart auto-colour
            </Button>
          </>
        )}
      </Section>

      <Section
        title="Image palette"
        description={
          imagePalette.length > 0
            ? "Tap a colour to apply it to the selected text."
            : undefined
        }
        action={
          <Droplet size={14} className="text-[var(--text-muted)]" aria-hidden="true" />
        }
      >
        {imagePalette.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-[12px] text-[var(--text-muted)]">
            Add an image to extract its colours.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {imagePalette.map((color, index) => (
              <button
                key={`${color}-${index}`}
                type="button"
                onClick={() => applyColor(color)}
                aria-label={`Apply ${color}`}
                className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg p-1 outline-none transition-colors hover:bg-black/[0.04] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <span
                  className="aspect-square w-full rounded-md border border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] transition-transform group-hover:scale-[1.03] group-active:scale-95"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                  {color}
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
