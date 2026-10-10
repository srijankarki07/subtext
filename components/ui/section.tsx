"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * An inspector section: heading, optional trailing action, hairline rule,
 * content.
 *
 * DESIGN/ and the design doc both ask for sections separated by spacing and a
 * rule rather than a bordered card around every group - the panels previously
 * wrapped almost everything in `rounded-md border border-white/[0.05]
 * bg-white/[0.02]`, which is what made the inspector read as a dense control
 * wall.
 *
 * Labels are sentence case, not uppercase (design doc §34).
 */

interface SectionProps {
  title: string
  /** Optional control rendered on the right of the heading row. */
  action?: React.ReactNode
  /** Optional description under the heading. */
  description?: string
  children: React.ReactNode
  className?: string
  /** Drop the hairline rule, for sections that end a panel. */
  bare?: boolean
}

function Section({
  title,
  action,
  description,
  children,
  className,
  bare = false,
}: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>

      {!bare && <div className="-mt-1.5 h-px bg-border" />}

      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

export { Section }
export type { SectionProps }
