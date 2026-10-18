"use client"

import { X } from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
import { TOOL_PANELS } from "@/components/editor/toolRegistry"
import { TOOL_META, type EditorTool, type ToolMeta } from "@/lib/tools"

/**
 * The browsing / insertion panel that sits beside the tool rail.
 *
 * It is a white surface on the paper chrome, so a panel reads as a card in the
 * DESIGN/ hierarchy rather than as another slab of chrome.
 *
 * The body is the only scroll region: several panels used to add a second
 * `overflow-y-auto` plus a `pb-24` spacer inside this one, which produced two
 * nested scrollbars and 96px of dead space at the bottom.
 *
 * Which panel, what it is called and what it says underneath all come from the
 * tool registry. This file used to hold two hand-maintained tool lists of its
 * own - the copy, and a dispatch chain whose last branch meant "text" - and both
 * had to be kept in step with the rail by hand.
 */

export default function ContextPanel({
  activeTool,
  onClose,
}: {
  activeTool: EditorTool
  onClose: () => void
}) {
  // Annotated deliberately: `TOOL_META`'s inferred type is per-tool, and the
  // panel-less tool has no `hint` property at all. Widening to `ToolMeta` reads
  // it as `string | undefined`, which is what it is.
  const meta: ToolMeta = TOOL_META[activeTool]
  const Panel = TOOL_PANELS[activeTool]

  return (
    <aside className="hidden w-[252px] shrink-0 flex-col border-r border-border bg-card select-none lg:flex">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-foreground">
            {meta.label}
          </h2>
          {meta.hint && (
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              {meta.hint}
            </p>
          )}
        </div>
        <IconButton
          icon={<X size={14} />}
          label="Close panel"
          size="sm"
          onClick={onClose}
        />
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {Panel && <Panel />}
      </div>
    </aside>
  )
}
