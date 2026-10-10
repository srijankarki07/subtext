"use client"

import { Columns2, Minimize2, Redo2, Undo2, Upload } from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * The only chrome left in focus mode.
 *
 * Focus mode hides the tool rail, the context panel and the inspector so the
 * artwork gets the whole window. Leaving *nothing* would be a trap - there would
 * be no way back and no way to act on what you are looking at - so this strip
 * floats over the artwork with the few things that are still worth having: undo
 * and redo, export, the before/after comparison, and the way out.
 *
 * It floats rather than occupying a row because a bar with a background would
 * put the artwork in a box again, which is the thing focus mode exists to undo.
 * The controls fade up when the pointer approaches the top of the window.
 */
export default function FocusBar({ onExit }: { onExit: () => void }) {
  const documentTitle = useEditorStore((s) => s.documentTitle)
  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)
  const isComparing = useEditorStore((s) => s.isComparing)
  const setComparing = useEditorStore((s) => s.setComparing)
  const setIsExportModalOpen = useEditorStore((s) => s.setIsExportModalOpen)

  return (
    <div className="z-popover pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-[var(--color-on-workspace-hairline)] bg-[var(--color-workspace-raised)]/85 px-2 py-1.5 backdrop-blur-md">
        <span className="max-w-[16rem] truncate px-2 text-[12px] font-medium text-[var(--color-on-workspace)]">
          {documentTitle || "Untitled"}
        </span>

        <span
          aria-hidden="true"
          className="mx-0.5 h-4 w-px bg-[var(--color-on-workspace-hairline)]"
        />

        <IconButton
          icon={<Undo2 size={15} />}
          label="Undo"
          size="sm"
          disabled={!canUndo}
          onClick={() => void useEditorStore.getState().undo()}
        />
        <IconButton
          icon={<Redo2 size={15} />}
          label="Redo"
          size="sm"
          disabled={!canRedo}
          onClick={() => void useEditorStore.getState().redo()}
        />
        <IconButton
          icon={<Columns2 size={15} />}
          label={
            isComparing ? "Hide the comparison" : "Compare with the original"
          }
          size="sm"
          active={isComparing}
          onClick={() => setComparing(!isComparing)}
        />
        <IconButton
          icon={<Upload size={15} />}
          label="Export artwork"
          size="sm"
          onClick={() => setIsExportModalOpen(true)}
        />

        <span
          aria-hidden="true"
          className="mx-0.5 h-4 w-px bg-[var(--color-on-workspace-hairline)]"
        />

        <IconButton
          icon={<Minimize2 size={15} />}
          label="Leave focus mode"
          size="sm"
          onClick={onExit}
        />
        <span className="hidden pr-1.5 font-mono text-[10px] text-[var(--color-on-workspace-faint)] sm:inline">
          F
        </span>
      </div>
    </div>
  )
}
