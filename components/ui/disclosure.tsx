"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A collapsed section, for detail that supports a decision rather than being it.
 *
 * The inspector is 324px wide, so a block of explanatory detail pushes the
 * controls the user actually came for below the fold. Progressive disclosure is
 * the answer the design doc asks for, and this is the shape of it.
 *
 * Built on native `<details>`, deliberately: it is keyboard operable and
 * announced correctly by screen readers with no JavaScript, and the "How this is
 * scored" block in the colour panel was already written this way by hand. This
 * gives that pattern a home so the styling is not repeated at each call site.
 */

interface DisclosureProps {
  /** The always-visible line. Keep it a phrase, not a sentence. */
  summary: string
  children: React.ReactNode
  /** Open on first paint. For a disclosure that is the point of the panel. */
  defaultOpen?: boolean
  className?: string
}

function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
}: DisclosureProps) {
  return (
    <details
      open={defaultOpen}
      className={cn("group border-t border-border pt-3", className)}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-1 text-[11px] text-[var(--text-muted)] outline-none",
          "transition-colors hover:text-[var(--text-secondary)]",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        )}
      >
        {/* `group-open:` rather than JS: the open state already lives on the
            element, so a stylesheet rule can read it. */}
        <ChevronRight
          size={11}
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-90"
        />
        {summary}
      </summary>
      {/*
        Hiding is done here rather than left to the browser.

        A closed `<details>` is *supposed* to hide its content, and the styling
        was written as though it did — but measured, `details.open` was false
        while the content sat on screen with `display: block`. Chrome no longer
        hides it with a `display` rule on the children (its chrome lives behind
        `::details-content`), and any `display` utility on the direct child
        outranks the user-agent rule anyway. So the disclosure toggled its own
        state and changed nothing visible. `group-open:` is the same variant the
        chevron uses, and it is verified by the inspector suite.
      */}
      <div className="hidden group-open:block">
        <div className="mt-2 flex flex-col gap-3">{children}</div>
      </div>
    </details>
  )
}

export { Disclosure }
export type { DisclosureProps }
