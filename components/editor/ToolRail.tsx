"use client"

import { Tooltip } from "@/components/ui/tooltip"
import { TOOL_ICONS } from "@/components/editor/toolRegistry"
import { TOOL_META, TOOL_ORDER, type EditorTool } from "@/lib/tools"
import { cn } from "@/lib/utils"

/**
 * The tool spine.
 *
 * DESIGN/ §6: compact, muted when inactive, a soft selected surface when
 * active - the rail frames the artwork rather than competing with it.
 *
 * It renders `TOOL_ORDER` and reads the rest from the registry, so adding a
 * tool means declaring it in `lib/tools.ts` and binding its icon and panel in
 * `toolRegistry.tsx`. This file needs no edit for a new tool, which is the
 * point: it used to hold both the union and the tool list, and both had to
 * agree with four other files by hand.
 *
 * The labels use the shared `Tooltip` primitive, which opens on keyboard focus
 * as well as hover; the previous `group-hover:block` span was invisible to
 * keyboard users.
 *
 * The "Layout" button that used to sit at the bottom has been removed: it had
 * no `onClick` at all, so it was a control that did nothing. Composition tools
 * return here as a real panel in a later pass rather than as a dead icon.
 */

export default function ToolRail({
  activeTool,
  isPanelOpen,
  onToolChange,
}: {
  activeTool: EditorTool
  /** Whether the active tool's panel is currently showing. */
  isPanelOpen: boolean
  onToolChange: (tool: EditorTool) => void
}) {
  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center border-r border-border bg-background py-3 lg:flex">
      {/* Wordmark. Neutral on purpose: Export keeps the only chromatic emphasis. */}
      <div className="mb-4 flex size-9 items-center justify-center rounded-lg border border-border bg-card font-serif text-[15px] text-foreground">
        S
      </div>

      <nav
        aria-label="Editor tools"
        className="flex flex-col items-center gap-1"
      >
        {TOOL_ORDER.map((id) => {
          const { label, shortcut, hasPanel } = TOOL_META[id]
          const Icon = TOOL_ICONS[id]
          const isActive = activeTool === id

          return (
            <Tooltip key={id} label={label} shortcut={shortcut} side="right">
              <button
                type="button"
                aria-label={label}
                aria-pressed={isActive}
                // A tool with no panel never claims to be expanded, and the
                // attribute is absent rather than `false`: "no panel" is not
                // "collapsed".
                aria-expanded={hasPanel ? isActive && isPanelOpen : undefined}
                onClick={() => onToolChange(id)}
                className={cn(
                  "relative flex size-10 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-subtle-hover hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute -left-3 h-5 w-0.5 rounded-r-full bg-primary" />
                )}
                <Icon size={17} strokeWidth={1.7} />
              </button>
            </Tooltip>
          )
        })}
      </nav>
    </aside>
  )
}
