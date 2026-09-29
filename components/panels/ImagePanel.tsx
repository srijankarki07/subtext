"use client"

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartVertical,
  Maximize,
  Minimize,
  MoveLeft,
  MoveRight,
  Trash2,
} from "lucide-react"

import { AlignmentButton } from "@/components/functions"
import { Button } from "@/components/ui/button"
import { Section } from "@/components/ui/section"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * Image properties.
 *
 * The sizing tiles are the one place two side-by-side "big" buttons earn their
 * space: fill vs fit is a genuine either/or that users need to see at a glance.
 */
export default function ImagePanel() {
  const activeObject = useEditorStore((s) => s.activeObject)
  const alignObjectToCanvas = useEditorStore((s) => s.alignObjectToCanvas)
  const fitImageToCanvas = useEditorStore((s) => s.fitImageToCanvas)
  const deleteActiveObject = useEditorStore((s) => s.deleteActiveObject)

  if (!activeObject || activeObject.type !== "image") {
    return null
  }

  const sizeTile =
    "flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card py-3.5 text-[var(--text-secondary)] outline-none transition-colors hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.98]"

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Sizing"
        description="Fill crops to the artboard; fit keeps the whole image."
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fitImageToCanvas("fill")}
            className={sizeTile}
          >
            <Maximize size={17} aria-hidden="true" />
            <span className="text-[12px] font-medium">Fill canvas</span>
          </button>
          <button
            type="button"
            onClick={() => fitImageToCanvas("fit")}
            className={sizeTile}
          >
            <Minimize size={17} aria-hidden="true" />
            <span className="text-[12px] font-medium">Fit to canvas</span>
          </button>
        </div>
      </Section>

      <Section title="Alignment">
        <div className="grid grid-cols-6 gap-1 rounded-lg bg-subtle p-1">
          <AlignmentButton
            icon={<MoveLeft size={16} />}
            label="Align left"
            onClick={() => alignObjectToCanvas("left")}
          />
          <AlignmentButton
            icon={<AlignCenterHorizontal size={16} />}
            label="Align horizontal centre"
            onClick={() => alignObjectToCanvas("center-h")}
          />
          <AlignmentButton
            icon={<MoveRight size={16} />}
            label="Align right"
            onClick={() => alignObjectToCanvas("right")}
          />
          <AlignmentButton
            icon={<AlignStartVertical size={16} />}
            label="Align top"
            onClick={() => alignObjectToCanvas("top")}
          />
          <AlignmentButton
            icon={<AlignCenterVertical size={16} />}
            label="Align vertical centre"
            onClick={() => alignObjectToCanvas("center-v")}
          />
          <AlignmentButton
            icon={<AlignEndVertical size={16} />}
            label="Align bottom"
            onClick={() => alignObjectToCanvas("bottom")}
          />
        </div>
      </Section>

      <Button
        variant="destructive"
        className="w-full"
        onClick={() => deleteActiveObject()}
      >
        <Trash2 size={15} />
        Remove image
      </Button>
    </div>
  )
}
