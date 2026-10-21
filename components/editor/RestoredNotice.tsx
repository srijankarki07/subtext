"use client"

import { History, X } from "lucide-react"

import { useEditorStore } from "@/store/useEditorStore"

/**
 * Says that a stored document was brought back, and offers to start over.
 *
 * Without this the app just quietly has yesterday's composition on the canvas,
 * which reads as a bug rather than as a feature. It is a strip rather than a
 * dialog on purpose: the decision it presents ("keep working, or start fresh?")
 * can wait, and a modal on every launch would be the first thing a returning
 * user has to dismiss.
 *
 * "Start fresh" is the destructive option and is styled as such, but it is not
 * irreversible by accident - it goes through the same confirmation as New canvas
 * by calling that action rather than clearing storage itself.
 */

export default function RestoredNotice() {
  const restoredAt = useEditorStore((s) => s.restoredAt)
  const documentTitle = useEditorStore((s) => s.documentTitle)
  const acknowledgeRestore = useEditorStore((s) => s.acknowledgeRestore)
  const newDesign = useEditorStore((s) => s.newDesign)

  if (!restoredAt) return null

  return (
    <div
      role="status"
      data-slot="restored-notice"
      className="flex shrink-0 items-center gap-3 border-b border-border bg-subtle px-3 py-2 sm:px-4"
    >
      <History
        size={13}
        aria-hidden="true"
        className="shrink-0 text-[var(--text-muted)]"
      />
      <p className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-secondary)]">
        Your last session came back{restoredAt ? ` (saved ${restoredAt})` : ""}
        {documentTitle && documentTitle !== "Untitled"
          ? ` - ${documentTitle}`
          : ""}
        .
      </p>

      <button
        type="button"
        onClick={() => newDesign()}
        className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors outline-none hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        Start fresh
      </button>

      <button
        type="button"
        aria-label="Dismiss restored session notice"
        onClick={acknowledgeRestore}
        className="shrink-0 cursor-pointer rounded-md p-1 text-[var(--text-muted)] transition-colors outline-none hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  )
}
