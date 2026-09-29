"use client"

import {
  ImagePlus,
  Layers3,
  LayoutTemplate,
  MonitorPlay,
  MousePointer2,
  Type,
} from "lucide-react"

import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * The tool spine.
 *
 * DESIGN/ §6: compact, muted when inactive, a soft selected surface when
 * active — the rail frames the artwork rather than competing with it.
 *
 * The labels use the shared `Tooltip` primitive, which opens on keyboard focus
 * as well as hover; the previous `group-hover:block` span was invisible to
 * keyboard users.
 *
 * The "Layout" button that used to sit at the bottom has been removed: it had
 * no `onClick` at all, so it was a control that did nothing. Composition tools
 * return here as a real panel in a later pass rather than as a dead icon.
 */

export type EditorTool =
  | "select"
  | "text"
  | "media"
  | "templates"
  | "cinema"
  | "layers"

const TOOLS = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { id: "text", label: "Text", icon: Type, shortcut: "T" },
  { id: "media", label: "Media", icon: ImagePlus, shortcut: "M" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, shortcut: "P" },
  { id: "cinema", label: "Cinema", icon: MonitorPlay, shortcut: "C" },
  { id: "layers", label: "Layers", icon: Layers3, shortcut: "L" },
] satisfies {
  id: EditorTool
  label: string
  icon: typeof MousePointer2
  shortcut: string
}[]

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

      <nav aria-label="Editor tools" className="flex flex-col items-center gap-1">
        {TOOLS.map(({ id, label, icon: Icon, shortcut }) => {
          const isActive = activeTool === id

          return (
            <Tooltip key={id} label={label} shortcut={shortcut} side="right">
              <button
                type="button"
                aria-label={label}
                aria-pressed={isActive}
                // "Select" is a mode with no panel, so it never claims to be
                // expanded; the others report whether their panel is showing.
                aria-expanded={
                  id === "select" ? undefined : isActive ? isPanelOpen : false
                }
                onClick={() => onToolChange(id)}
                className={cn(
                  "relative flex size-10 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors",
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
