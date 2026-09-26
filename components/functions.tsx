"use client"

import * as React from "react"

import { IconButton } from "@/components/ui/icon-button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

/**
 * Shared editor controls.
 *
 * These are thin, tokenised wrappers over the primitives in `components/ui`.
 * They keep their existing names so the panels did not need rewriting in the
 * same change, but they no longer hardcode dark hex values, and the icon-only
 * controls now require an accessible name.
 *
 * `ColorPickerDropdown` used to live here and has been replaced by
 * `ColorPopover` in `components/ui/color-popover` — see that file for why.
 */

export function AlignmentButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  /** Accessible name, e.g. "Align left". */
  label: string
  onClick: () => void
}) {
  return <IconButton icon={icon} label={label} onClick={onClick} />
}

export function FormatButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  /** Accessible name, e.g. "Bold". */
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <IconButton icon={icon} label={label} active={isActive} onClick={onClick} />
  )
}

/**
 * A colour swatch.
 *
 * Spreads unknown props so it can serve directly as a `Popover.Trigger` render
 * target; when used that way the popover supplies the accessible name. Pass
 * `aria-label` when rendering it standalone.
 */
export function ColorCircle({
  color,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "color"> & { color: string }) {
  return (
    <button
      type="button"
      className={cn(
        "size-6 shrink-0 cursor-pointer rounded-full border border-black/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]",
        "transition-transform outline-none hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95",
        className
      )}
      style={{ backgroundColor: color }}
      {...props}
    />
  )
}

export function PresetButton({
  label,
  onClick,
  isDanger,
}: {
  label: string
  onClick: () => void
  isDanger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 cursor-pointer rounded-lg py-1.5 text-[11px] font-medium transition-colors",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.98]",
        isDanger
          ? "text-[var(--text-muted)] hover:bg-destructive/10 hover:text-destructive"
          : "border border-border bg-white text-[var(--text-secondary)] hover:bg-black/[0.03] hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

/**
 * @deprecated Use `Slider` from `components/ui/slider`. Kept as an alias so
 * panels can be migrated one at a time.
 */
export function AppleSlider(props: React.ComponentProps<typeof Slider>) {
  return <Slider {...props} />
}
