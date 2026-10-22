"use client"

import { useState } from "react"
import { ActiveSelection } from "fabric"
import {
  Eye,
  EyeOff,
  Group,
  Image as ImageIcon,
  Lock,
  MonitorPlay,
  Shapes,
  Square,
  Trash2,
  Type,
  Unlock,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Section } from "@/components/ui/section"
import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * Layer list.
 *
 * Two fixes worth naming. Every non-text object used to be labelled "Background
 * Image", so vignettes, letterbox bars, blur zones and gradients were all
 * indistinguishable; they now carry their own names and icons. And the drop
 * indicator was a `border-t-2` that changed the row's box, shifting the whole
 * list by a pixel mid-drag - it is now an overlay that costs no layout.
 */

type Layer = {
  id: string
  label: string
  icon: typeof Type
  obj: any
}

/**
 * Internal objects that implement another control rather than being artwork in
 * their own right. A blur zone is a handle plus up to four clipped copies of
 * the image; listing all five as layers buried the real content and let them be
 * deleted one at a time.
 */
function isInternal(obj: any): boolean {
  const id = String(obj.id ?? "")
  return id.startsWith("blur-overlay-")
}

function describe(obj: any): { label: string; icon: typeof Type } {
  if (obj.type === "i-text") {
    const text = typeof obj.text === "string" ? obj.text.trim() : ""
    return { label: text.substring(0, 24) || "Empty text", icon: Type }
  }

  const id = String(obj.id ?? "")

  if (id.startsWith("vignette")) return { label: "Vignette", icon: MonitorPlay }
  if (id.endsWith("-top") || id.endsWith("-bottom"))
    return { label: "Letterbox bar", icon: Square }
  if (id.startsWith("letterbox"))
    return { label: "Letterbox bar", icon: Square }
  if (id.includes("gradient"))
    return { label: "Gradient overlay", icon: MonitorPlay }
  if (id.includes("blur")) return { label: "Blur zone", icon: MonitorPlay }
  if (obj.isEffect) return { label: "Effect", icon: MonitorPlay }
  if (obj.type === "image") return { label: "Image", icon: ImageIcon }

  // Inserted elements are Groups too, so their catalogue name wins first.
  if (obj.elementName) return { label: obj.elementName, icon: Shapes }
  if (typeof obj.getObjects === "function" && obj.type !== "activeselection") {
    return { label: "Group", icon: Group }
  }

  return { label: obj.type ?? "Layer", icon: Square }
}

/**
 * A row's preview.
 *
 * The list was a column of identical glyphs - a text row, an image row and a
 * vignette row all read the same at a glance, so finding a layer meant reading
 * every label. Each kind now shows what it is: text renders in its own face and
 * colour, an image shows its own pixels, and the effect layers show the thing
 * they do to the picture.
 *
 * Deliberately cheap. The image row points at the object's existing source
 * rather than rendering a thumbnail onto a canvas: the browser is already
 * scaling it, and a `toDataURL` per row per render would make the panel the
 * slowest thing in the editor.
 */
function LayerThumb({ obj, icon: Icon }: { obj: any; icon: typeof Type }) {
  const frame =
    "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-black/10 dark:ring-white/15"

  if (obj.type === "i-text") {
    return (
      <span
        className={cn(frame, "bg-subtle")}
        style={{ color: obj.fill as string }}
        aria-hidden="true"
      >
        <span
          className="text-[17px] leading-none"
          style={{
            fontFamily: obj.fontFamily as string,
            fontWeight: (obj.fontWeight as string) ?? "normal",
            fontStyle: (obj.fontStyle as string) ?? "normal",
          }}
        >
          {String(obj.text ?? "T")
            .replace(/["“”]/g, "")
            .trim()
            .charAt(0) || "T"}
        </span>
      </span>
    )
  }

  if (obj.type === "image" && typeof obj.getSrc === "function") {
    const src = obj.getSrc() as string
    if (src) {
      return (
        <span className={frame} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="size-full object-cover" />
        </span>
      )
    }
  }

  const id = String(obj.id ?? "")
  const swatch = id.startsWith("vignette")
    ? "radial-gradient(circle at 50% 50%, transparent 35%, #000 100%)"
    : id.includes("gradient")
      ? "linear-gradient(to top, #000 0%, transparent 70%)"
      : id.startsWith("letterbox") ||
          id.endsWith("-top") ||
          id.endsWith("-bottom")
        ? "linear-gradient(to bottom, #000 0 40%, #555 40% 60%, #000 60% 100%)"
        : id.includes("blur")
          ? "linear-gradient(to bottom right, #6b7280 0%, #d1d5db 50%, #6b7280 100%)"
          : null

  if (swatch) {
    return (
      <span
        className={frame}
        style={{ background: swatch }}
        aria-hidden="true"
      />
    )
  }

  return (
    <span
      className={cn(frame, "bg-subtle text-[var(--text-muted)]")}
      aria-hidden="true"
    >
      <Icon size={14} />
    </span>
  )
}

export default function LayersPanel() {
  const canvas = useEditorStore((s) => s.canvas)
  const activeObject = useEditorStore((s) => s.activeObject)
  const selectedObjects = useEditorStore((s) => s.selectedObjects)
  const moveLayerToIndex = useEditorStore((s) => s.moveLayerToIndex)
  const toggleLayerLock = useEditorStore((s) => s.toggleLayerLock)
  const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility)
  const deleteActiveObject = useEditorStore((s) => s.deleteActiveObject)

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // `Array.from(new Set(...))` guards the list against the same object being
  // present twice, which duplicated React keys and collapsed rows together.
  const objects = Array.from(new Set(canvas?.getObjects() ?? [])).filter(
    (obj) => !isInternal(obj)
  )

  if (objects.length === 0) {
    return (
      <p className="p-2 text-[12px] text-[var(--text-muted)]">
        Nothing on the artboard yet. Add text or an image to build up layers.
      </p>
    )
  }

  // Topmost layer first, matching how the canvas stacks.
  const layers: Layer[] = objects
    .map((obj, index) => ({
      id: String((obj as any).id ?? index),
      ...describe(obj),
      obj,
    }))
    .reverse()

  /**
   * Selects a row, optionally adding to what is already selected.
   *
   * A group is a real `ActiveSelection` on the canvas rather than a list of ids
   * in this component, so everything downstream - the inspector, the floating
   * toolbar, delete, drag - sees the same selection the canvas does. Holding a
   * private notion of "selected layers" in the panel is how two views of one
   * state drift apart.
   */
  const select = (obj: any, additive = false) => {
    if (!canvas) return

    const current = canvas.getActiveObjects()
    const next = !additive
      ? [obj]
      : current.includes(obj)
        ? current.filter((candidate) => candidate !== obj)
        : [...current, obj]

    if (next.length === 0) {
      canvas.discardActiveObject()
    } else if (next.length === 1) {
      canvas.setActiveObject(next[0])
    } else {
      canvas.setActiveObject(new ActiveSelection(next, { canvas } as never))
    }
    canvas.requestRenderAll()
    useEditorStore.getState().setSelection(next)
  }

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Layers"
        description="Top is front-most. Drag a row to reorder."
        action={
          <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] tabular-nums">
            {objects.length}
          </span>
        }
      >
        <div className="flex flex-col gap-1">
          {layers.map((layer) => {
            const actualIndex = objects.indexOf(layer.obj)
            const isSelected = selectedObjects.includes(layer.obj)
            const isLocked = Boolean(layer.obj.locked)
            const Icon = layer.icon

            return (
              <div
                key={`${layer.id}-${actualIndex}`}
                draggable
                onDragStart={(event) => {
                  setDraggedIndex(actualIndex)
                  event.dataTransfer.effectAllowed = "move"
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                  if (dragOverIndex !== actualIndex)
                    setDragOverIndex(actualIndex)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (draggedIndex !== null && draggedIndex !== actualIndex) {
                    moveLayerToIndex(draggedIndex, actualIndex)
                  }
                  setDraggedIndex(null)
                  setDragOverIndex(null)
                }}
                onDragEnd={() => {
                  setDraggedIndex(null)
                  setDragOverIndex(null)
                }}
                onClick={(event) =>
                  select(
                    layer.obj,
                    event.shiftKey || event.metaKey || event.ctrlKey
                  )
                }
                onContextMenu={(event) => {
                  // Selected first, so the shared menu's actions apply to the row
                  // that was right-clicked rather than to whatever happened to be
                  // selected before.
                  event.preventDefault()
                  if (!isSelected) select(layer.obj)
                  useEditorStore
                    .getState()
                    .openContextMenu(event.clientX, event.clientY, layer.obj)
                }}
                className={cn(
                  "relative flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors",
                  isSelected ? "bg-primary/[0.08]" : "hover:bg-subtle-hover",
                  draggedIndex === actualIndex && "opacity-40"
                )}
              >
                {/* Drop indicator drawn as an overlay so it cannot shift layout. */}
                {dragOverIndex === actualIndex &&
                  draggedIndex !== actualIndex && (
                    <span className="pointer-events-none absolute inset-x-0 -top-0.5 h-0.5 rounded-full bg-primary" />
                  )}

                <span className="flex min-w-0 items-center gap-2.5">
                  <LayerThumb obj={layer.obj} icon={Icon} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[12px] font-medium text-foreground">
                      {layer.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {layer.obj.type === "i-text"
                        ? "Text"
                        : layer.obj.type === "image"
                          ? "Photo"
                          : "Effect"}{" "}
                      · {actualIndex + 1}
                    </span>
                  </span>
                </span>

                <span
                  className="flex shrink-0 items-center gap-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <IconButton
                    icon={
                      layer.obj.visible ? (
                        <Eye size={14} />
                      ) : (
                        <EyeOff size={14} />
                      )
                    }
                    label={layer.obj.visible ? "Hide layer" : "Show layer"}
                    size="sm"
                    tone={layer.obj.visible ? "default" : "danger"}
                    onClick={() => toggleLayerVisibility(layer.obj)}
                  />
                  <IconButton
                    icon={isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    label={isLocked ? "Unlock layer" : "Lock layer"}
                    size="sm"
                    active={isLocked ? true : undefined}
                    onClick={() => toggleLayerLock(layer.obj)}
                  />
                </span>
              </div>
            )
          })}
        </div>
      </Section>

      {activeObject && (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => deleteActiveObject()}
        >
          <Trash2 size={15} />
          Delete layer
        </Button>
      )}
    </div>
  )
}
