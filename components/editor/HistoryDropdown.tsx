"use client"

import { useState } from "react"
import { Check, History, Layers } from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * The version timeline.
 *
 * Now built on the shared Popover primitive, which fixes several things the
 * hand-rolled version got wrong: it had click-outside but no Escape, no
 * viewport clamp (a 288px panel anchored near the right of the toolbar could
 * be clipped by the app shell's `overflow-hidden` with no way to scroll to it),
 * and its inner list let wheel scrolling leak to the page behind it.
 */
export default function HistoryDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const history = useEditorStore((s) => s.history)
  const historyIndex = useEditorStore((s) => s.historyIndex)
  const jumpToHistoryIndex = useEditorStore((s) => s.jumpToHistoryIndex)

  const handleSelect = async (index: number) => {
    await jumpToHistoryIndex(index)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {/* The trigger must be the native button itself — wrapping it in a div
          made Base UI warn that button semantics were being dropped. */}
      <PopoverTrigger
        render={
          <IconButton
            icon={
              <>
                <History size={15} />
                {history.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold text-primary-foreground">
                    {historyIndex + 1}
                  </span>
                )}
              </>
            }
            label="Version history"
            active={isOpen}
            className="relative overflow-visible"
          />
        }
      />

      <PopoverContent align="start" className="w-[288px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[12px] font-semibold text-foreground">
            Version history
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
            {history.length === 0 ? "0" : historyIndex + 1} / {history.length}
          </span>
        </div>

        <div className="custom-scrollbar max-h-72 space-y-0.5 overflow-y-auto overscroll-contain p-2">
          {history.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-[var(--text-muted)]">
              No edits recorded yet
            </p>
          ) : (
            history.map((item, index) => {
              const isCurrent = index === historyIndex
              const isFuture = index > historyIndex

              return (
                <button
                  key={item.id || index}
                  type="button"
                  onClick={() => handleSelect(index)}
                  aria-current={isCurrent || undefined}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left outline-none transition-colors",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    isCurrent
                      ? "bg-primary/10"
                      : isFuture
                        ? "opacity-50 hover:bg-black/[0.04] hover:opacity-100"
                        : "hover:bg-black/[0.04]"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[10px] tabular-nums",
                        isCurrent
                          ? "font-bold text-primary"
                          : "text-[var(--text-muted)]"
                      )}
                    >
                      #{index + 1}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[12px] leading-tight font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                        <span>{item.timestamp}</span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <Layers size={9} aria-hidden="true" />
                          {item.objectCount}
                        </span>
                      </span>
                    </span>
                  </span>

                  {/* Not colour-only: the current entry is labelled. */}
                  {isCurrent && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                      <Check size={9} aria-hidden="true" /> Current
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
