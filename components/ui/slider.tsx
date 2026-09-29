"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

/**
 * A labelled slider.
 *
 * The interactive region is the Control (32px tall via `py-2.5`), not the 4px
 * track — the previous hand-rolled range input was a 6px-tall strip with
 * `outline-none`, which was both hard to grab and invisible to keyboard users.
 * Base UI supplies keyboard stepping, the hidden range input for form/a11y
 * integration, and `aria-valuetext` wiring.
 *
 * DESIGN/ §37: the track stays quiet and the accent appears on the active
 * portion only.
 */

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Overrides the visible readout. Defaults to locale formatting based on `step`. */
  formatValue?: (value: number) => string
  /** Hides the numeric readout, for sliders whose value is shown elsewhere. */
  hideValue?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
  hideValue = false,
  disabled = false,
  className,
  id,
}: SliderProps) {
  const reactId = React.useId()
  const sliderId = id ?? reactId

  return (
    <SliderPrimitive.Root
      id={sliderId}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      // Keeps the default readout at the same precision the panels expect
      // (one decimal for fractional steps, none otherwise), and feeds the
      // thumb's aria-valuetext so screen readers announce it too.
      format={{ maximumFractionDigits: step < 1 ? 1 : 0 }}
      onValueChange={(next) => {
        onChange(Array.isArray(next) ? next[0] : next)
      }}
      className={cn("flex flex-col gap-1", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <SliderPrimitive.Label className="text-[12px] text-[var(--text-secondary)]">
          {label}
        </SliderPrimitive.Label>
        {hideValue || (
          <SliderPrimitive.Value className="text-[12px] text-[var(--text-muted)] tabular-nums">
            {formatValue ? () => formatValue(value) : null}
          </SliderPrimitive.Value>
        )}
      </div>

      <SliderPrimitive.Control className="flex w-full touch-none items-center py-2.5 select-none">
        <SliderPrimitive.Track className="h-1 w-full rounded-full bg-black/10 select-none">
          <SliderPrimitive.Indicator className="rounded-full bg-primary select-none" />
          <SliderPrimitive.Thumb
            aria-label={label}
            className={cn(
              "size-4 cursor-grab rounded-full border border-swatch-edge bg-card shadow-sm select-none",
              "active:cursor-grabbing",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
            )}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
