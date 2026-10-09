import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A section as a panel rather than a band.
 *
 * Every reference the user supplied does the same thing: the content lives in a
 * rounded container inset from the page, not in a full-bleed strip with a
 * changing background colour. That is what makes a long marketing page read as a
 * set of objects — modules you could reorder — instead of one continuous poster.
 *
 * Three tones, and they are literal rather than themed:
 *
 * - `paper` — the page's own colour. For sections that should feel like part of
 *   the page rather than a card on it.
 * - `raised` — a white (or dark-theme card) panel with a border. The default.
 * - `dark` — the fixed near-black panel, identical in both themes. This is the
 *   tone that carries the mock UI and the live demos, because a screen recording
 *   of an app is dark in real life.
 */
export function Module({
  tone = "raised",
  className,
  children,
  as: Tag = "section",
  id,
}: {
  tone?: "paper" | "raised" | "dark"
  className?: string
  children: React.ReactNode
  as?: "section" | "div" | "article" | "aside"
  id?: string
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "relative scroll-mt-24 overflow-hidden rounded-[26px] border",
        tone === "raised" && "border-border bg-card",
        tone === "paper" && "border-transparent bg-transparent",
        tone === "dark" &&
          "border-module-dark-border bg-module-dark text-on-module",
        // Padding lives here so every module agrees on its inset, which is what
        // makes the rhythm between them consistent.
        "px-6 py-10 sm:px-9 sm:py-12 lg:px-14 lg:py-16",
        className
      )}
    >
      {children}
    </Tag>
  )
}

/**
 * The eyebrow → headline → body rhythm every reference opens with.
 *
 * Kept in one place because it is the page's most repeated shape: a small chip,
 * a large tight heading, then a measured paragraph. Getting the spacing slightly
 * different in each section is what makes a page feel assembled rather than
 * designed.
 *
 * `tone` is not decoration. The copy colours were previously fixed, and on a
 * dark module that meant `#615D59` body text on `#0E0E10` — 2.96:1, which is
 * unreadable. The panel's own `text-on-module` inheritance is not enough either,
 * because these elements set a colour explicitly.
 */
export function ModuleHeading({
  eyebrow,
  title,
  body,
  align = "left",
  tone = "light",
  className,
  children,
}: {
  eyebrow?: string
  title: React.ReactNode
  body?: React.ReactNode
  align?: "left" | "center"
  tone?: "light" | "dark"
  className?: string
  children?: React.ReactNode
}) {
  const dark = tone === "dark"

  return (
    <div
      className={cn(
        "flex flex-col",
        // Explicit rather than inherited: the chip is a flex child, so without
        // this it stretches to the full width of the column and the pill reads
        // as a bar.
        align === "center" ? "items-center text-center" : "items-start",
        className
      )}
    >
      {eyebrow && (
        // The dot is not decoration: it gives the chip a leading anchor so a row
        // of them reads as labels rather than as stray words.
        <span
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium",
            dark
              ? "border-white/10 bg-white/5 text-on-module-muted"
              : "border-border bg-card text-[var(--text-secondary)]"
          )}
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-primary"
          />
          {eyebrow}
        </span>
      )}

      <h2
        className={cn(
          "mt-5 text-[30px] leading-[1.06] font-bold tracking-[-0.035em] text-balance sm:text-[38px] lg:text-[44px]",
          dark ? "text-on-module" : "text-foreground",
          align === "center" && "max-w-3xl"
        )}
      >
        {title}
      </h2>

      {body && (
        <p
          className={cn(
            "mt-4 max-w-xl text-[15px] leading-relaxed sm:text-[16px]",
            dark ? "text-on-module-muted" : "text-[var(--text-secondary)]",
            align === "center" && "mx-auto"
          )}
        >
          {body}
        </p>
      )}

      {children}
    </div>
  )
}
