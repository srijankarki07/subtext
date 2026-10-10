"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  buildCommands,
  formatShortcut,
  searchCommands,
  type CommandHandlers,
} from "@/lib/commands"
import { cn } from "@/lib/utils"

/**
 * The command palette.
 *
 * `⌘K` for everything the editor can do. The panels are for making things and
 * the palette is for *finding* things — the twentieth template, "send to back",
 * "toggle the safe area" — none of which are worth a permanent control and all of
 * which are annoying to hunt for.
 *
 * Two decisions worth naming:
 *
 * - **A real list, rendered flat.** Group headings are drawn between rows rather
 *   than as nested lists, because arrow keys need to move through one linear
 *   sequence. Nesting them and then flattening an index back out is how
 *   keyboard navigation ends up skipping or double-stepping.
 * - **It closes before it runs.** Several commands open dialogs of their own, and
 *   a palette still closing underneath a dialog that just opened fights for
 *   focus. Closing first also means the command's own dialog wins the focus
 *   rather than the palette's input reclaiming it.
 */

export default function CommandPalette({
  open,
  onOpenChange,
  handlers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  handlers: CommandHandlers
}) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const isMac = useIsMac()

  const commands = useMemo(() => buildCommands(handlers), [handlers])
  /*
   * Every match, with no cap.
   *
   * There was a 40-result ceiling, which with an empty query silently hid whole
   * groups — Templates and Document were simply not in the list, so browsing the
   * palette gave a false picture of what the editor can do, and a palette that
   * hides things is worse than one that makes you scroll. Sixty rows in a
   * scrollable list costs nothing.
   */
  const results = useMemo(
    () => searchCommands(commands, query),
    [commands, query]
  )

  // Reset to the top whenever the query changes, so Enter runs the first result
  // rather than whatever happened to be highlighted under the old list.
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  // Keep the highlighted row in view as the arrows move past the fold.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const row = list.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    row?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, results])

  const run = (index: number) => {
    const command = results[index]
    if (!command) return
    onOpenChange(false)
    // Deferred by a frame: the command may open a dialog, and the palette's own
    // close animation should not be competing with it for the focus.
    requestAnimationFrame(() => command.run())
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === "Home") {
      event.preventDefault()
      setActiveIndex(0)
      return
    }
    if (event.key === "End") {
      event.preventDefault()
      setActiveIndex(results.length - 1)
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      run(activeIndex)
    }
  }

  // Group headings are drawn where the group changes, over a flat list.
  let previousGroup: string | null = null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Overridden from the shared dialog's centred box: a palette belongs near
        // the top, where the eye already is, and it wants to be wider.
        className="top-[10vh] max-w-lg translate-y-0 p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>

        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <Search
            size={15}
            className="shrink-0 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search actions, templates, panels…"
            aria-label="Search commands"
            aria-controls="command-palette-results"
            className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-[var(--text-muted)]"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
            Esc
          </kbd>
        </div>

        <div
          id="command-palette-results"
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className="custom-scrollbar max-h-[52vh] overflow-y-auto overscroll-contain p-1.5"
        >
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-[var(--text-muted)]">
              Nothing matches “{query}”.
            </p>
          ) : (
            results.map((command, index) => {
              const heading =
                command.group !== previousGroup ? command.group : null
              previousGroup = command.group
              const isActive = index === activeIndex

              return (
                <div key={command.id}>
                  {heading && (
                    <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--text-muted)] uppercase">
                      {heading}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-index={index}
                    data-command={command.id}
                    onClick={() => run(index)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-2.5 py-2 text-left transition-colors outline-none",
                      isActive
                        ? "bg-primary/8 text-foreground"
                        : "text-[var(--text-secondary)]"
                    )}
                  >
                    <span className="truncate text-[13px]">
                      {command.title}
                    </span>
                    {command.shortcut && (
                      <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                        {formatShortcut(command.shortcut, isMac)}
                      </span>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The modifier label, from the same test the context menu uses. */
function useIsMac() {
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
  }, [])
  return isMac
}
