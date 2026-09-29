"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A segmented control.
 *
 * The app previously hand-built this three times with three different active
 * styles (one using `bg-white text-black`, one `bg-white/20 text-white`, one
 * `bg-white` inside a `rounded-xl` container). This is the single replacement.
 *
 * Implemented as buttons in a labelled `group` with `aria-pressed` rather than
 * `role="tablist"`: these controls switch a value, not a tab panel.
 */

interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name for the group, e.g. "Vignette type". */
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  size?: "sm" | "md"
  className?: string
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-subtle p-0.5",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              size === "md" ? "h-7 px-2.5 text-[12px]" : "h-6 px-2 text-[11px]",
              selected
                ? "bg-card text-foreground shadow-xs"
                : "text-[var(--text-secondary)] hover:text-foreground"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
export type { SegmentedControlProps, SegmentedOption }
