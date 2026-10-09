"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Italic,
  Maximize2,
  Minimize2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"

import { ColorPopover } from "@/components/ui/color-popover"
import { Tooltip } from "@/components/ui/tooltip"
import { readFontWeight } from "@/lib/fabricDocument"
import { classifySelection } from "@/lib/selection"
import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * The toolbar that follows the selection.
 *
 * The inspector holds everything an object can be told, which is the right place
 * for the long tail and the wrong place for the four things people reach for
 * constantly. This puts those next to the thing they apply to, so a change of
 * colour or alignment does not mean a trip across the window and back.
 *
 * It is deliberately *only* shortcuts to what already exists: every button calls
 * the same store action the inspector calls. A second implementation of a
 * control is a second place for it to be wrong.
 *
 * Positioning is the whole difficulty. Fabric draws the selection on the canvas,
 * so its screen position has to be derived: the object's box is in canvas
 * coordinates (`getBoundingRect`), and the canvas element is scaled by CSS, so
 * the mapping is `canvasRect.left + sceneX * zoom`. The zoom comes from the
 * store rather than `canvas.getZoom()`, which stays at 1 because this app scales
 * with CSS.
 */

const GAP = 12

interface Placement {
  /** Centre of the object's box, in the container's coordinates. */
  left: number
  /** The box's top and bottom edges, likewise. */
  top: number
  bottom: number
  /** False when there is no room above, so the bar goes below instead. */
  above: boolean
}

export default function SelectionToolbar({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const canvas = useEditorStore((s) => s.canvas)
  const selectedObjects = useEditorStore((s) => s.selectedObjects)
  const zoom = useEditorStore((s) => s.zoom)
  const [placement, setPlacement] = useState<Placement | null>(null)

  const summary = classifySelection(selectedObjects)

  /**
   * Where the toolbar goes, in the workspace container's coordinates.
   *
   * Recomputed from scratch rather than tracked incrementally, because every
   * input to it can change independently: the object moves, the artboard zooms,
   * the panel opens and narrows the workspace, the page scrolls.
   */
  const place = useCallback(() => {
    const container = containerRef.current
    const target = selectedObjects[0]
    if (!container || !canvas || !target) {
      setPlacement(null)
      return
    }

    const canvasElement = canvas.getElement()
    const canvasBox = canvasElement.getBoundingClientRect()
    const containerBox = container.getBoundingClientRect()
    const rect = target.getBoundingRect()

    const left = canvasBox.left - containerBox.left + rect.left * zoom
    const top = canvasBox.top - containerBox.top + rect.top * zoom
    const width = rect.width * zoom

    setPlacement({
      left: left + width / 2,
      top,
      bottom: top + rect.height * zoom,
      // Measured against the container, not the window: the bar lives inside the
      // workspace, so that is the edge it has to clear.
      above: top > 56,
    })
  }, [canvas, containerRef, selectedObjects, zoom])

  useEffect(() => {
    place()
  }, [place])

  useEffect(() => {
    if (!canvas) return
    // While dragging, the toolbar tracks the object — the same events the canvas
    // already listens to, rather than a reason to re-render on every frame.
    const events = [
      "object:moving",
      "object:scaling",
      "object:rotating",
      "object:modified",
      "selection:created",
      "selection:updated",
      "selection:cleared",
    ] as const
    events.forEach((event) => canvas.on(event, place))
    // The workspace scrolls inside its own container, and the window can scroll
    // too, so both need to move the bar with the artwork.
    window.addEventListener("scroll", place, true)
    window.addEventListener("resize", place)
    return () => {
      events.forEach((event) => canvas.off(event, place))
      window.removeEventListener("scroll", place, true)
      window.removeEventListener("resize", place)
    }
  }, [canvas, place])

  // Hidden while a text layer is being edited: the caret and the bar would be
  // competing for the same space, and the bar's actions do not apply mid-edit.
  const isEditing = (selectedObjects[0] as { isEditing?: boolean } | undefined)
    ?.isEditing
  if (!placement || summary.kind === "none" || isEditing) return null

  return (
    <div
      data-slot="selection-toolbar"
      role="toolbar"
      aria-label={`Actions for ${summary.label}`}
      style={{
        left: placement.left,
        // Centred on the object, above it when there is room and below it when
        // there is not — an object at the top of the artboard would otherwise put
        // the bar over the toolbar or off the workspace entirely.
        top: placement.above ? placement.top - GAP : placement.bottom + GAP,
        transform: placement.above
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)",
      }}
      className={cn(
        "z-popover absolute flex items-center gap-0.5 rounded-xl border border-border bg-card p-1",
        "shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-8px_rgb(0_0_0/0.28)]"
      )}
      // The toolbar is chrome, so a drag started on it must not move the object.
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Actions summary={summary} />
    </div>
  )
}

/** The buttons, chosen by what is selected. */
function Actions({
  summary,
}: {
  summary: ReturnType<typeof classifySelection>
}) {
  /*
   * Subscribed to as a change *signal*, not for its value.
   *
   * The buttons show state — is this text bold, which way is it aligned — read
   * from the live object through `getActiveSelectionStyle`. That reads the canvas,
   * which is not reactive, so nothing here would re-render after a style was
   * applied and the bold button would keep showing the state it had before the
   * click. Every edit commits a history entry, so the stack is the signal that
   * the document changed. Removing this as an unused variable breaks the toolbar
   * in a way that looks like a stale-value bug rather than a missing subscription.
   */
  const changeSignal = useEditorStore((s) => s.history)
  void changeSignal

  // Actions come from `getState` rather than a subscription: they are stable, and
  // subscribing to the whole store would re-render this on every frame of a drag.
  const store = useEditorStore.getState()

  const items: React.ReactNode[] = []

  if (summary.kind === "text") {
    const style = store.getActiveSelectionStyle as (key: string) => unknown
    const weight = readFontWeight(style("fontWeight"))
    const italic = style("fontStyle") as string | null
    const align = style("textAlign") as string | null

    items.push(
      <BarButton
        key="bold"
        label="Bold"
        active={weight >= 700}
        onClick={() =>
          store.applyTextStyle("fontWeight", weight >= 700 ? 400 : 700)
        }
      >
        <Bold size={14} />
      </BarButton>,
      <BarButton
        key="italic"
        label="Italic"
        active={italic === "italic"}
        onClick={() =>
          store.applyTextStyle(
            "fontStyle",
            italic === "italic" ? "normal" : "italic"
          )
        }
      >
        <Italic size={14} />
      </BarButton>,
      <Divider key="d1" />,
      ...(["left", "center", "right"] as const).map((value) => {
        const Icon =
          value === "left"
            ? AlignLeft
            : value === "center"
              ? AlignCenter
              : AlignRight
        const label = `Align ${value}`
        return (
          <BarButton
            key={value}
            label={label}
            active={align === value}
            onClick={() => store.applyTextStyle("textAlign", value)}
          >
            <Icon size={14} />
          </BarButton>
        )
      }),
      <Divider key="d2" />,
      <ColorPopover
        key="colour"
        label="Text colour"
        value={String(style("fill") ?? "#FFFFFF")}
        onChange={(colour) => store.applyTextStyle("fill", colour)}
      />
    )
  }

  if (summary.kind === "image") {
    items.push(
      <BarButton
        key="fill"
        label="Fill the canvas"
        onClick={() => store.fitImageToCanvas("fill")}
      >
        <Maximize2 size={14} />
      </BarButton>,
      <BarButton
        key="fit"
        label="Fit the whole photo"
        onClick={() => store.fitImageToCanvas("fit")}
      >
        <Minimize2 size={14} />
      </BarButton>,
      <Divider key="d" />,
      <BarButton
        key="replace"
        label="Replace the photo"
        onClick={() => store.replaceImage()}
      >
        <RefreshCw size={14} />
      </BarButton>
    )
  }

  items.push(
    <Divider key="d3" />,
    ...(summary.count > 1
      ? [
          <BarButton
            key="deselect"
            label="Deselect all"
            onClick={() => store.setSelection([])}
          >
            <X size={14} />
          </BarButton>,
        ]
      : [
          <BarButton
            key="duplicate"
            label="Duplicate"
            onClick={() => store.duplicateActiveObject()}
          >
            <Copy size={14} />
          </BarButton>,
        ]),
    <BarButton
      key="delete"
      label={summary.count > 1 ? `Delete ${summary.count} layers` : "Delete"}
      destructive
      onClick={() => store.deleteActiveObject()}
    >
      <Trash2 size={14} />
    </BarButton>
  )

  return <>{items}</>
}

function BarButton({
  label,
  active,
  destructive,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  destructive?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
          destructive
            ? "text-[var(--text-muted)] hover:bg-destructive/10 hover:text-destructive"
            : active
              ? "bg-primary/10 text-primary"
              : "text-[var(--text-secondary)] hover:bg-subtle-hover hover:text-foreground"
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
}
