"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The editor's icon-only button.
 *
 * `label` is required and always wins over any spread props, so an icon-only
 * control can never ship without an accessible name - the previous code had
 * only six `aria-label`s across the whole editor, and several controls were a
 * bare `<Trash2 size={12} />` with no padding at all.
 *
 * Targets are 32px by default (DESIGN/ §36) and 28px at the small size, which
 * is the floor for a pointer target in this app.
 */

interface IconButtonProps extends Omit<
  React.ComponentProps<"button">,
  "aria-label"
> {
  /** Accessible name. Required - this is the whole point of the component. */
  label: string
  icon: React.ReactNode
  /**
   * Only pass this on a toggle. Leaving it undefined keeps the button out of
   * the pressed state entirely; passing a boolean sets `aria-pressed` and
   * highlights the button when true.
   */
  active?: boolean
  tone?: "default" | "danger"
  size?: "sm" | "md"
}

function IconButton({
  label,
  icon,
  active,
  tone = "default",
  size = "md",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      data-slot="icon-button"
      type={type}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={label}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "md" ? "size-8" : "size-7",
        tone === "danger"
          ? "text-[var(--text-muted)] hover:bg-destructive/10 hover:text-destructive"
          : active
            ? "bg-primary/10 text-primary"
            : "text-[var(--text-secondary)] hover:bg-subtle-hover hover:text-foreground",
        className
      )}
      {...props}
    >
      {icon}
    </button>
  )
}

export { IconButton }
export type { IconButtonProps }
