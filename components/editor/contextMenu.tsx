"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Maximize,
  Minimize,
  Trash2,
  Unlock,
} from "lucide-react"

import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * Right-click menu for the object under the pointer.
 *
 * Three fixes over the previous version:
 * - Position is measured from the rendered menu instead of a hardcoded
 *   `menuHeight = 280`. The real height varies with the target (image targets
 *   add two rows), so the clamp was wrong and items could be cut off.
 * - It reserves space for the mobile tab bar. The menu and the nav were both
 *   `z-50`, so the nav won on DOM order and painted over the menu's bottom rows.
 * - Shortcut labels follow the platform instead of always claiming ⌘, and the
 *   delete row now shows its shortcut.
 */

const MENU_WIDTH = 224
const EDGE = 12
const MOBILE_NAV_HEIGHT = 68

function useIsMac() {
  const [isMac, setIsMac] = useState(true)
  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent))
  }, [])
  return isMac
}

export default function ContextMenu() {
  const contextMenu = useEditorStore((s) => s.contextMenu)
  const closeContextMenu = useEditorStore((s) => s.closeContextMenu)
  const bringToFront = useEditorStore((s) => s.bringToFront)
  const bringForward = useEditorStore((s) => s.bringForward)
  const sendBackward = useEditorStore((s) => s.sendBackward)
  const sendToBack = useEditorStore((s) => s.sendToBack)
  const duplicateActiveObject = useEditorStore((s) => s.duplicateActiveObject)
  const toggleLayerLock = useEditorStore((s) => s.toggleLayerLock)
  const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility)
  const deleteActiveObject = useEditorStore((s) => s.deleteActiveObject)
  const fitImageToCanvas = useEditorStore((s) => s.fitImageToCanvas)

  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null
  )
  const isMac = useIsMac()
  const mod = isMac ? "⌘" : "Ctrl"

  // Measure the menu, then place it inside the viewport.
  useLayoutEffect(() => {
    if (!contextMenu.visible) {
      setPosition(null)
      return
    }
    const el = menuRef.current
    if (!el) return

    const { width, height } = el.getBoundingClientRect()
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches
    const reservedBottom = isDesktop ? 0 : MOBILE_NAV_HEIGHT

    setPosition({
      left: Math.max(
        EDGE,
        Math.min(contextMenu.x, window.innerWidth - width - EDGE)
      ),
      top: Math.max(
        EDGE,
        Math.min(
          contextMenu.y,
          window.innerHeight - reservedBottom - height - EDGE
        )
      ),
    })
  }, [contextMenu.visible, contextMenu.x, contextMenu.y, contextMenu.targetObject])

  useEffect(() => {
    if (!contextMenu.visible) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) closeContextMenu()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu()
    }
    window.addEventListener("mousedown", onPointerDown)
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("mousedown", onPointerDown)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [contextMenu.visible, closeContextMenu])

  if (!contextMenu.visible) return null

  const target = contextMenu.targetObject
  const isLocked = Boolean(target?.lockMovementX)
  const isVisible = target ? target.visible : true
  const isImage = target?.type === "image"

  const item =
    "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-foreground outline-none transition-colors hover:bg-subtle-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
  const hint = "font-mono text-[10px] text-[var(--text-muted)]"

  /** Runs an action and dismisses the menu, like the image rows already did. */
  const run = (action: () => void) => () => {
    action()
    closeContextMenu()
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Object actions"
      onContextMenu={(event) => event.preventDefault()}
      style={{
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.top}px` : 0,
        width: MENU_WIDTH,
        visibility: position ? "visible" : "hidden",
      }}
      className="z-context-menu fixed rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
    >
      {isImage && (
        <>
          <div className="space-y-0.5">
            <button
              role="menuitem"
              onClick={run(() => fitImageToCanvas("fill"))}
              className={item}
            >
              <span className="flex items-center gap-2.5">
                <Maximize size={14} className="text-[var(--text-muted)]" />
                Fill canvas
              </span>
            </button>
            <button
              role="menuitem"
              onClick={run(() => fitImageToCanvas("fit"))}
              className={item}
            >
              <span className="flex items-center gap-2.5">
                <Minimize size={14} className="text-[var(--text-muted)]" />
                Fit to canvas
              </span>
            </button>
          </div>
          <div className="my-1 h-px bg-border" />
        </>
      )}

      <div className="space-y-0.5">
        <button role="menuitem" onClick={run(bringToFront)} className={item}>
          <span className="flex items-center gap-2.5">
            <ChevronsUp size={14} className="text-[var(--text-muted)]" />
            Bring to front
          </span>
          <span className={hint}>{mod} ]</span>
        </button>
        <button role="menuitem" onClick={run(bringForward)} className={item}>
          <span className="flex items-center gap-2.5">
            <ArrowUp size={14} className="text-[var(--text-muted)]" />
            Bring forward
          </span>
          <span className={hint}>{mod} ⌥ ]</span>
        </button>
        <button role="menuitem" onClick={run(sendBackward)} className={item}>
          <span className="flex items-center gap-2.5">
            <ArrowDown size={14} className="text-[var(--text-muted)]" />
            Send backward
          </span>
          <span className={hint}>{mod} ⌥ [</span>
        </button>
        <button role="menuitem" onClick={run(sendToBack)} className={item}>
          <span className="flex items-center gap-2.5">
            <ChevronsDown size={14} className="text-[var(--text-muted)]" />
            Send to back
          </span>
          <span className={hint}>{mod} [</span>
        </button>
      </div>

      <div className="my-1 h-px bg-border" />

      <div className="space-y-0.5">
        <button
          role="menuitem"
          onClick={run(duplicateActiveObject)}
          className={item}
        >
          <span className="flex items-center gap-2.5">
            <Copy size={14} className="text-[var(--text-muted)]" />
            Duplicate
          </span>
          <span className={hint}>{mod} D</span>
        </button>

        {/* Lock and visibility stay open on purpose so both can be flipped. */}
        <button
          role="menuitem"
          onClick={() => toggleLayerLock(target)}
          className={item}
        >
          <span className="flex items-center gap-2.5">
            {isLocked ? (
              <Lock size={14} className="text-[var(--color-saffron)]" />
            ) : (
              <Unlock size={14} className="text-[var(--text-muted)]" />
            )}
            {isLocked ? "Unlock layer" : "Lock layer"}
          </span>
        </button>

        <button
          role="menuitem"
          onClick={() => toggleLayerVisibility(target)}
          className={item}
        >
          <span className="flex items-center gap-2.5">
            {isVisible ? (
              <Eye size={14} className="text-[var(--text-muted)]" />
            ) : (
              <EyeOff size={14} className="text-destructive" />
            )}
            {isVisible ? "Hide layer" : "Show layer"}
          </span>
        </button>
      </div>

      <div className="my-1 h-px bg-border" />

      <button
        role="menuitem"
        onClick={run(() => deleteActiveObject(target))}
        className={cn(item, "text-destructive hover:bg-destructive/10")}
      >
        <span className="flex items-center gap-2.5">
          <Trash2 size={14} />
          Delete
        </span>
        <span className={cn(hint, "text-destructive/70")}>Del</span>
      </button>
    </div>
  )
}
