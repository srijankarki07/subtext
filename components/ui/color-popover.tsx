"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * Colour picker popover.
 *
 * Replaces the old `ColorPickerDropdown`, which was absolutely positioned
 * inside the panel's scroll container and was therefore clipped — worst of all
 * in the duotone row, where its ~133px parent hid more than half of a fixed
 * 240px panel. It also had no dismissal path at all (`isOpen` in, but no
 * `onClose` and no outside-click or Escape handling), so the only way to close
 * it was to click the same swatch again.
 *
 * This version renders through `Popover.Portal`, so it cannot be clipped, and
 * inherits click-outside, Escape and collision-aware positioning.
 *
 * It is uncontrolled on purpose: the trigger owns its own open state, so panels
 * no longer need to track which picker is open.
 */

/**
 * A cinematic palette for text over photography. The previous list was the iOS
 * system colours (bright red/green/blue), which are the wrong vocabulary for
 * this product.
 */
const PRESET_COLORS = [
  "#FFFFFF",
  "#F5F4EF",
  "#A7A49A",
  "#6E6B63",
  "#1C1C1E",
  "#000000",
  "#FFB110",
  "#E89D01",
  "#F64932",
  "#E32D14",
  "#62AEF0",
  "#02093A",
]

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Expands `#abc` to `#AABBCC`, uppercases, and returns null if not a hex colour. */
function normaliseHex(input: string): string | null {
  const match = HEX_PATTERN.exec(input.trim())
  if (!match) return null
  const body = match[1]
  const full =
    body.length === 3
      ? body
          .split("")
          .map((c) => c + c)
          .join("")
      : body
  return `#${full.toUpperCase()}`
}

function ColorSwatch({
  color,
  selected = false,
  size = "md",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  color: string
  selected?: boolean
  size?: "sm" | "md" | "lg"
}) {
  return (
    <span
      className={cn(
        "block shrink-0 rounded-full border border-black/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]",
        size === "sm" && "size-4",
        size === "md" && "size-6",
        size === "lg" && "size-8",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-popover",
        className
      )}
      style={{ backgroundColor: color }}
      {...props}
    />
  )
}

interface ColorPopoverProps {
  value: string
  onChange: (color: string) => void
  /** Accessible name for the trigger, e.g. "Text colour". */
  label: string
  /** Supply a custom trigger element. Defaults to a colour swatch. */
  trigger?: React.ReactElement
  /** Hide the preset grid for pickers that only need free choice. */
  showPresets?: boolean
  align?: "start" | "center" | "end"
}

function ColorPopover({
  value,
  onChange,
  label,
  trigger,
  showPresets = true,
  align = "end",
}: ColorPopoverProps) {
  // Local draft for the hex field so typing never pushes an invalid value into
  // the canvas. The old component called onChange on every keystroke, so typing
  // "#F" set fill="#F" and the text layer visibly disappeared.
  const [draft, setDraft] = React.useState(value)
  const [invalid, setInvalid] = React.useState(false)

  React.useEffect(() => {
    setDraft(value)
    setInvalid(false)
  }, [value])

  const commitDraft = (raw: string) => {
    const next = normaliseHex(raw)
    if (next) {
      setInvalid(false)
      setDraft(next)
      onChange(next)
    } else {
      setInvalid(true)
    }
  }

  const current = value?.toUpperCase() ?? ""
  // The default trigger is a real <button>; a bare swatch <span> would make
  // Base UI drop native button semantics from the trigger.
  const triggerElement = trigger ?? (
    <button
      type="button"
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors hover:bg-black/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <ColorSwatch color={value} />
    </button>
  )

  return (
    <Popover>
      <PopoverTrigger
        render={triggerElement}
        aria-label={`${label}. Current colour ${value}.`}
      />
      <PopoverContent align={align} className="w-[232px]">
        <p className="px-1 pb-2 text-[11px] font-medium text-[var(--text-secondary)]">
          {label}
        </p>

        {showPresets && (
          <div className="grid grid-cols-6 gap-1.5 px-1 pb-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                aria-label={preset}
                aria-pressed={current === preset}
                className={cn(
                  "flex size-7 cursor-pointer items-center justify-center rounded-full transition-transform",
                  "outline-none hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  "active:scale-95"
                )}
              >
                <ColorSwatch
                  color={preset}
                  // Case-insensitive: palette and Fabric colours come back
                  // lowercase, so the old `===` check never matched and the
                  // selection ring silently failed to appear.
                  selected={current === preset}
                  className="pointer-events-none"
                />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 border-t border-border px-1 pt-2">
          <label className="sr-only" htmlFor={`${label}-hex`}>
            {label} hex value
          </label>
          <input
            id={`${label}-hex`}
            type="text"
            inputMode="text"
            spellCheck={false}
            maxLength={7}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setInvalid(false)
            }}
            onBlur={(event) => commitDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitDraft((event.target as HTMLInputElement).value)
              }
            }}
            aria-invalid={invalid || undefined}
            className={cn(
              "min-w-0 flex-1 rounded-md border bg-white px-2 py-1.5 font-mono text-[12px] uppercase",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              invalid
                ? "border-destructive text-destructive"
                : "border-border text-foreground"
            )}
          />

          {/* Free choice, which the old picker could not offer at all. */}
          <label
            className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border hover:bg-black/[0.04]"
            title="Custom colour"
          >
            <span className="sr-only">Custom {label.toLowerCase()}</span>
            <input
              type="color"
              value={normaliseHex(draft) ?? "#FFFFFF"}
              onChange={(event) => commitDraft(event.target.value)}
              className="size-5 cursor-pointer appearance-none border-0 bg-transparent p-0"
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { ColorPopover, ColorSwatch, PRESET_COLORS, normaliseHex }
