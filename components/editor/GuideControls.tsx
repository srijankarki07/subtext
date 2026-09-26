"use client"

import { useState } from "react"
import { Check, Grid2x2 } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useEditorStore } from "@/store/useEditorStore"
import type { GuidesState } from "@/types/store.types"
import { cn } from "@/lib/utils"

/**
 * The composition-guides control, in the workspace toolbar beside the zoom.
 *
 * It belongs here rather than in the inspector because it is a property of the
 * *view*, not of the document or of any one layer — turning the grid on is not
 * an edit, it should not be undoable, and it should be reachable whether or not
 * anything is selected.
 *
 * The menu is explicit that snapping is always on: the guides are the visible
 * half, and a user who reads only this menu should still learn that the pull
 * exists and how to escape it.
 */

const ROWS: Array<{ key: keyof GuidesState; label: string; hint: string }> = [
  { key: "thirds", label: "Rule of thirds", hint: "Two lines each way" },
  { key: "centre", label: "Centre lines", hint: "Middle of the frame" },
  { key: "safeArea", label: "Safe area", hint: "5% margin, for UI overlays" },
]

export default function GuideControls({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const guides = useEditorStore((s) => s.guides)
  const toggleGuide = useEditorStore((s) => s.toggleGuide)

  const anyOn = guides.thirds || guides.centre || guides.safeArea

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Composition guides"
            aria-expanded={isOpen}
            title="Composition guides"
            className={cn(
              className,
              anyOn && "text-[var(--color-on-workspace)]"
            )}
          >
            <Grid2x2 size={13} aria-hidden="true" />
          </button>
        }
      />

      <PopoverContent align="end" className="w-60 p-0" side="top">
        <div className="border-b border-border px-3 py-2">
          <span className="text-[12px] font-semibold text-foreground">
            Composition guides
          </span>
        </div>

        <div className="p-1">
          {ROWS.map((row) => {
            const on = guides[row.key]
            return (
              <button
                key={row.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleGuide(row.key)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors outline-none",
                  "hover:bg-subtle-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                )}
              >
                {/* On/off is a visible tick as well as a pressed state, so it is
                    not colour-only. */}
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-[var(--edge-strong)]"
                  )}
                >
                  {on && <Check size={9} aria-hidden="true" />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[12px] leading-tight font-medium text-foreground">
                    {row.label}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {row.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <p className="border-t border-border px-3 py-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
          Layers snap to the guides, each other and the centre as you drag. Hold{" "}
          <kbd className="rounded border border-border px-1 font-mono text-[9px]">
            Alt
          </kbd>{" "}
          to place something off-grid.
        </p>
      </PopoverContent>
    </Popover>
  )
}
