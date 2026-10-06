"use client"

import {
  AlertTriangle,
  CheckCircle2,
  Droplet,
  PaintBucket,
  Wand2,
} from "lucide-react"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Disclosure } from "@/components/ui/disclosure"
import { Section } from "@/components/ui/section"
import { rankColours, recommend } from "@/lib/visibility"
import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * Visibility — the product's core claim, so it gets the panel rather than a row.
 *
 * Three contrast figures are shown rather than one, because the difference
 * between them is the point: the *worst* case is what a reader's eye actually
 * hits, the typical case is what most of the quote sits on, and the area mean is
 * what the engine used to measure — a colour that often exists nowhere in the
 * image. Showing all three makes the score auditable instead of a magic number.
 */

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-3 shrink-0 rounded-full border border-swatch-edge"
      style={{ backgroundColor: color }}
    />
  )
}

function Metric({
  label,
  ratio,
  color,
  hint,
}: {
  label: string
  ratio: number
  color: string
  hint: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
        <Swatch color={color} />
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">{hint}</span>
        <span className="text-foreground tabular-nums">
          {ratio.toFixed(2)}:1
        </span>
      </span>
    </div>
  )
}

export default function ColorPanel() {
  const activeObject = useEditorStore((s) => s.activeObject)
  const visibility = useEditorStore((s) => s.visibility)
  const imagePalette = useEditorStore((s) => s.imagePalette)
  const autoColorText = useEditorStore((s) => s.autoColorText)
  const applyTextStyle = useEditorStore((s) => s.applyTextStyle)

  const candidates = useMemo(
    () => (visibility ? rankColours(visibility, imagePalette) : []),
    [visibility, imagePalette]
  )
  const suggestions = useMemo(
    () => (visibility ? recommend(visibility) : []),
    [visibility]
  )

  if (!activeObject || activeObject.type !== "i-text") {
    return (
      <p className="text-[12px] text-[var(--text-muted)]">
        Select a text layer to see how readable it is.
      </p>
    )
  }

  if (!visibility) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-[12px] text-[var(--text-muted)]">
        Measuring the background underneath the text…
      </p>
    )
  }

  const failing = visibility.badge === "FAIL"
  const carriedBy = visibility.source === "stroke" ? "outline" : "shadow"

  return (
    <div className="flex flex-col gap-6">
      <Section title="Visibility">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[34px] leading-none font-light tracking-tight text-foreground tabular-nums">
              {visibility.score}
              <span className="ml-1 text-[14px] text-[var(--text-muted)]">
                /100
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Estimated readability
            </p>
          </div>

          {/* Status is never colour-only: icon and word as well. */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              failing
                ? "bg-destructive/10 text-destructive"
                : "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
            )}
          >
            {failing ? (
              <AlertTriangle size={10} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={10} aria-hidden="true" />
            )}
            {failing ? "TOO LOW" : `${visibility.badge} PASS`}
          </span>
        </div>

        <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-[var(--text-muted)]">
          <span>
            {visibility.isLargeText ? "Large text" : "Body text"} · needs{" "}
            {visibility.requiredRatio}:1
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {Math.round(visibility.fontSize)}px
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {visibility.region.samples.toLocaleString()} px
          </span>
        </p>

        {/*
          The score and its verdict stay on screen — they are the point of the
          panel. Everything that *supports* the number is folded away, because
          three metrics, a list of notes and an arithmetic table is most of a
          324px column, and it was pushing the suggestions and the colour picker
          off the bottom of it.
        */}
        <Disclosure summary="Why this score">
          <div className="flex flex-col gap-1.5">
            <Metric
              label="Worst case"
              ratio={visibility.worstRatio}
              color={visibility.worstHex}
              hint="hardest part"
            />
            <Metric
              label="Typical"
              ratio={visibility.typicalRatio}
              color={visibility.typicalHex}
              hint="most of it"
            />
            <Metric
              label="Area mean"
              ratio={visibility.meanRatio}
              color={visibility.meanHex}
              hint="averaging"
            />
          </div>

          {visibility.notes.length > 0 && (
            <ul className="flex flex-col gap-1">
              {visibility.notes.map((note) => (
                <li
                  key={note}
                  className="text-[11px] leading-relaxed text-[var(--text-secondary)]"
                >
                  {note}
                </li>
              ))}
            </ul>
          )}

          {visibility.source !== "fill" && (
            <p className="rounded-lg bg-subtle p-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              The {carriedBy} is doing the work here. The fill alone would give{" "}
              {visibility.edges[0].ratio.toFixed(1)}:1.
            </p>
          )}

          {/* The arithmetic, so the score can be argued with. */}
          <Disclosure summary="How this is scored" className="border-t-0 pt-0">
            <ul className="flex flex-col gap-1">
              {visibility.breakdown.map((row) => (
                <li
                  key={row.label}
                  className="flex items-start justify-between gap-2 text-[11px]"
                >
                  <span className="text-[var(--text-secondary)]">
                    {row.label}
                    <span className="block text-[10px] text-[var(--text-muted)]">
                      {row.detail}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      row.delta < 0
                        ? "text-[var(--text-muted)]"
                        : "text-foreground"
                    )}
                  >
                    {row.delta > 0 ? "+" : ""}
                    {row.delta}
                  </span>
                </li>
              ))}
            </ul>
          </Disclosure>
        </Disclosure>
      </Section>

      {suggestions.length > 0 && (
        <Section
          title="Suggestions"
          description="Measured before you apply them."
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-2.5"
            >
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground">
                  {suggestion.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {suggestion.detail}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {suggestion.predictedScore !== null && (
                  <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                    → {suggestion.predictedScore}
                  </span>
                )}
                {suggestion.apply && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      const apply = suggestion.apply
                      if (!apply) return
                      if (apply.kind === "stroke") {
                        applyTextStyle("stroke", apply.color)
                        applyTextStyle("strokeWidth", apply.width)
                      } else {
                        applyTextStyle("fill", apply.color)
                      }
                    }}
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section
        title="Text colour"
        description="Ranked by the score each one would reach."
        action={
          <Button variant="secondary" size="xs" onClick={autoColorText}>
            <Wand2 size={12} aria-hidden="true" />
            Best
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {candidates.map((candidate) => (
            <button
              key={`${candidate.color}-${candidate.label}`}
              type="button"
              onClick={() => applyTextStyle("fill", candidate.color)}
              aria-label={`Use ${candidate.color}, ${candidate.label}, ${candidate.ratio.toFixed(1)} to 1`}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 transition-colors outline-none",
                "hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                candidate.origin === "current" && "bg-primary/[0.08]"
              )}
            >
              <span
                className="h-7 w-full rounded-md border border-swatch-edge"
                style={{ backgroundColor: candidate.color }}
              />
              <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                {candidate.ratio.toFixed(1)}:1
              </span>
              <span className="w-full truncate text-center text-[10px] text-[var(--text-muted)]">
                {candidate.origin === "current" ? "Current" : candidate.label}
              </span>
            </button>
          ))}
        </div>
        <Button variant="secondary" className="w-full" onClick={autoColorText}>
          <PaintBucket size={14} aria-hidden="true" />
          Smart auto-colour
        </Button>
      </Section>

      <Section
        title="Image palette"
        description={
          imagePalette.length > 0
            ? "Contrast is measured against the text's background, not the whole photo."
            : undefined
        }
        action={
          <Droplet
            size={14}
            aria-hidden="true"
            className="text-[var(--text-muted)]"
          />
        }
      >
        {imagePalette.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-[12px] text-[var(--text-muted)]">
            Add an image to extract its colours.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {imagePalette.map((color, index) => {
              const candidate = candidates.find((c) => c.color === color)
              return (
                <button
                  key={`${color}-${index}`}
                  type="button"
                  onClick={() => applyTextStyle("fill", color)}
                  aria-label={`Apply ${color}`}
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 transition-colors outline-none hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  <span
                    className="aspect-square w-full rounded-md border border-swatch-edge"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                    {color}
                  </span>
                  {candidate && (
                    <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                      {candidate.ratio.toFixed(1)}:1
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
