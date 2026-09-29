"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

/**
 * Tooltips.
 *
 * Base UI opens these on hover *and* on keyboard focus, which the previous
 * `hidden group-hover:block` tooltips in the tool rail did not — keyboard users
 * saw nothing.
 *
 * Mount one `<TooltipProvider>` near the root of the editor; individual
 * `<Tooltip>` elements only need to compose Root/Trigger/Popup.
 */

function TooltipProvider({
  delay = 350,
  children,
}: {
  delay?: number
  children: React.ReactNode
}) {
  return (
    <TooltipPrimitive.Provider delay={delay}>
      {children}
    </TooltipPrimitive.Provider>
  )
}

interface TooltipProps {
  /** The tooltip text. */
  label: string
  /** Optional keyboard shortcut hint, rendered as a `kbd` chip. */
  shortcut?: string
  side?: "top" | "bottom" | "left" | "right"
  /** A single element that receives the trigger props. */
  children: React.ReactElement
  className?: string
}

function Tooltip({
  label,
  shortcut,
  side = "bottom",
  children,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={6} className="isolate z-popover">
          <TooltipPrimitive.Popup
            data-slot="tooltip"
            className={cn(
              "z-popover flex items-center gap-1.5 rounded-lg border border-border bg-popover px-2 py-1",
              "text-[11px] whitespace-nowrap text-popover-foreground shadow-md",
              "origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out",
              "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
              className
            )}
          >
            {label}
            {shortcut && (
              <kbd className="rounded border border-border bg-black/[0.04] px-1 font-sans text-[10px] text-[var(--text-muted)]">
                {shortcut}
              </kbd>
            )}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip, TooltipProvider }
export type { TooltipProps }
