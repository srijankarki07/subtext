"use client"

import { useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  MonitorPlay,
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
 * list by a pixel mid-drag — it is now an overlay that costs no layout.
 */

type Layer = {
  id: string
  label: string
  icon: typeof Type
  obj: any
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

  return { label: obj.type ?? "Layer", icon: Square }
}

export default function LayersPanel() {
  const canvas = useEditorStore((s) => s.canvas)
  const activeObject = useEditorStore((s) => s.activeObject)
  const moveLayerToIndex = useEditorStore((s) => s.moveLayerToIndex)
  const toggleLayerLock = useEditorStore((s) => s.toggleLayerLock)
  const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility)
  const deleteActiveObject = useEditorStore((s) => s.deleteActiveObject)

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const objects = canvas?.getObjects() ?? []

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

  const select = (obj: any) => {
    canvas?.setActiveObject(obj)
    canvas?.requestRenderAll()
    useEditorStore.getState().setActiveObject(obj)
  }

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Layers"
        description="Top of the list is front-most."
        action={
          <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] tabular-nums">
            {objects.length}
          </span>
        }
      >
        <div className="flex flex-col gap-1">
          {layers.map((layer, listIndex) => {
            const actualIndex = objects.indexOf(layer.obj)
            const isSelected = activeObject === layer.obj
            const isLocked = Boolean(layer.obj.lockMovementX)
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
                  if (dragOverIndex !== actualIndex) setDragOverIndex(actualIndex)
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
                onClick={() => select(layer.obj)}
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
                  <Icon
                    size={15}
                    aria-hidden="true"
                    className={cn(
                      "shrink-0",
                      isSelected ? "text-primary" : "text-[var(--text-muted)]"
                    )}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[12px] font-medium text-foreground">
                      {layer.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Layer {actualIndex + 1}
                    </span>
                  </span>
                </span>

                <span
                  className="flex shrink-0 items-center gap-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <IconButton
                    icon={layer.obj.visible ? <Eye size={14} /> : <EyeOff size={14} />}
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
                  <IconButton
                    icon={<ArrowUp size={14} />}
                    label="Move layer forward"
                    size="sm"
                    disabled={listIndex === 0}
                    onClick={() =>
                      moveLayerToIndex(actualIndex, actualIndex + 1)
                    }
                  />
                  <IconButton
                    icon={<ArrowDown size={14} />}
                    label="Move layer backward"
                    size="sm"
                    disabled={listIndex === layers.length - 1}
                    onClick={() =>
                      moveLayerToIndex(actualIndex, actualIndex - 1)
                    }
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
