"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

/**
 * Popover primitives.
 *
 * Everything renders through `Popover.Portal`, so popover content escapes the
 * `overflow` of whatever panel it was declared in - the previous hand-rolled
 * dropdowns were absolutely positioned inside scroll containers and were
 * clipped. Base UI's Positioner also does collision detection and exposes
 * `--available-width` / `--available-height`, so the popup flips and shrinks to
 * stay on screen instead of overflowing.
 *
 * Click-outside, Escape and focus handling come from the primitive; nothing
 * here needs to register its own document listener.
 */

const Popover = PopoverPrimitive.Root

function PopoverTrigger({
  className,
  ...props
}: PopoverPrimitive.Trigger.Props) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      className={cn("cursor-pointer select-none", className)}
      {...props}
    />
  )
}

function PopoverContent({
  className,
  sideOffset = 6,
  align = "end",
  children,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        sideOffset={sideOffset}
        className="z-popover isolate"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            // DESIGN/ §Popovers: soft elevated surface, 12px radius, 1px
            // low-opacity border, quiet shadow, ~180ms fade/slide.
            "z-popover relative max-h-[var(--available-height)] max-w-[var(--available-width)]",
            "origin-[var(--transform-origin)] overflow-y-auto rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg",
            "transition-[opacity,transform] duration-150 ease-out outline-none",
            "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn(
        "px-1 pb-1.5 text-[12px] font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function PopoverClose({ className, ...props }: PopoverPrimitive.Close.Props) {
  return (
    <PopoverPrimitive.Close
      data-slot="popover-close"
      className={cn("cursor-pointer", className)}
      {...props}
    />
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverClose }
