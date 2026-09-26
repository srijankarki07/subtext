"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

/**
 * Dialog primitives.
 *
 * The previous confirm/alert dialogs were hand-rolled: no `role="dialog"`, no
 * `aria-modal`, no focus trap, no focus-on-open, no Escape, and a dead
 * `stopPropagation` where backdrop dismissal was clearly intended. Base UI
 * supplies all of it, including closing on backdrop click and Escape.
 */

const Dialog = DialogPrimitive.Root

function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className={cn(
          "z-dialog fixed inset-0 min-h-dvh bg-black/25 backdrop-blur-[2px]",
          "transition-opacity duration-150 ease-out",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
        )}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "z-dialog fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
          "rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl",
          "outline-none transition-[opacity,transform] duration-150 ease-out",
          "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
          "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-[15px] font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]",
        className
      )}
      {...props}
    />
  )
}

function DialogClose({ className, ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      className={cn("cursor-pointer", className)}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose }
