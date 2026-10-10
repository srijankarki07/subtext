import { cn } from "@/lib/utils"

import type { Step } from "./timeline"

/**
 * The step rail and caption that sit under every scripted demo.
 *
 * Shared because three of them now use it and the details are easy to get subtly
 * wrong three times over. Two of those details are load-bearing:
 *
 * - **Every caption is rendered, stacked in one grid cell, and revealed by
 *   `visible`/`invisible`.** Swapping one paragraph's text instead was the cause
 *   of a real layout shift in the hero: the captions are different lengths, so the
 *   figure's height changed on every beat and nudged the rest of the page down -
 *   four times a cycle, right where the reader was looking. The grid cell is
 *   always as tall as the longest caption, so nothing moves.
 * - **No cross-fade between captions.** Two of them at partial opacity in the same
 *   cell means one is legible through the other for the length of the transition,
 *   which reads as a rendering fault rather than as a transition.
 *
 * `tone` follows `ModuleHeading`'s convention and is not decoration: the hero's
 * caption sits on the page background, where the themed tokens are correct, and
 * the other two sit inside a fixed near-black `Module`, where `--text-secondary`
 * is 2.9:1 and unreadable. Same trap, same fix as that component's.
 */
export function SequenceCaption<TId extends string>({
  steps,
  activeStep,
  tone = "light",
  className,
}: {
  steps: readonly Step<TId>[]
  activeStep: TId
  tone?: "light" | "dark"
  className?: string
}) {
  const dark = tone === "dark"

  return (
    <figcaption className={cn("flex flex-col gap-2.5", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {steps.map((item, index) => {
          const active = item.id === activeStep
          return (
            <li key={item.id} className="flex items-center gap-2">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={
                    dark ? "text-on-module-muted" : "text-[var(--text-muted)]"
                  }
                >
                  →
                </span>
              )}
              <span
                className={cn(
                  "flex items-center gap-1.5 font-mono text-[11px] transition-colors",
                  active
                    ? dark
                      ? "text-on-module"
                      : "text-foreground"
                    : dark
                      ? "text-on-module-muted"
                      : "text-[var(--text-muted)]"
                )}
              >
                {/*
                  The accent marks the active beat as a dot rather than as the
                  label's colour: `--primary` is 4.19:1 on the page background,
                  which this page's own contrast audit rejects for text this size.
                  Always rendered, so the row does not shift as the beat moves.
                */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full bg-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                {item.label}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="grid">
        {steps.map((item) => (
          <p
            key={item.id}
            aria-hidden={item.id !== activeStep}
            className={cn(
              "col-start-1 row-start-1 text-[13px] leading-relaxed",
              dark ? "text-on-module-muted" : "text-[var(--text-secondary)]",
              item.id === activeStep ? "visible" : "invisible"
            )}
          >
            {item.caption}
          </p>
        ))}
      </div>
    </figcaption>
  )
}
