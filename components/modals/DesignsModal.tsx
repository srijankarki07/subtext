"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { IconButton } from "@/components/ui/icon-button"
import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * The local design library.
 *
 * Everything lives in this browser: there are no accounts, so "your designs"
 * means IndexedDB, and the copy can only travel by being exported. Replacing
 * the old single saved-copy slot is the point - a list with names, previews and
 * dates is a product; one overwritable slot is a save button.
 */

function relativeDate(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export default function DesignsModal() {
  const isOpen = useEditorStore((s) => s.isDesignsOpen)
  const designs = useEditorStore((s) => s.designs)
  const currentDesignId = useEditorStore((s) => s.currentDesignId)
  const isDirty = useEditorStore((s) => s.isDirty)
  const closeDesigns = useEditorStore((s) => s.closeDesigns)
  const openDesign = useEditorStore((s) => s.openDesign)
  const renameDesign = useEditorStore((s) => s.renameDesign)
  const removeDesign = useEditorStore((s) => s.removeDesign)
  const setConfirmDialog = useEditorStore((s) => s.setConfirmDialog)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  // An in-progress rename does not survive the dialog closing.
  useEffect(() => {
    if (!isOpen) setEditingId(null)
  }, [isOpen])

  const commitRename = (id: string) => {
    void renameDesign(id, draft)
    setEditingId(null)
  }

  const askForNewDesign = () => {
    // Close first: the confirmation is its own dialog, and stacking two focus
    // traps is a worse trade than making the user reopen the library.
    closeDesigns()
    setConfirmDialog({
      title: "Start a new design?",
      message: isDirty
        ? "The changes on the artboard have not been saved. They will be lost."
        : "The artboard will be cleared. Your saved designs are not affected.",
      confirmText: "New design",
      onConfirm: () => useEditorStore.getState().newDesign(),
    })
  }

  const askToDelete = (id: string, name: string) => {
    closeDesigns()
    setConfirmDialog({
      title: "Delete design?",
      message: `“${name}” will be removed from this browser.`,
      confirmText: "Delete",
      onConfirm: () => void removeDesign(id),
    })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeDesigns()
      }}
    >
      <DialogContent className="max-w-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle>Your designs</DialogTitle>
            <DialogDescription>Saved in this browser.</DialogDescription>
          </div>
          <IconButton
            icon={<X size={14} />}
            label="Close designs"
            size="sm"
            onClick={closeDesigns}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[11px] text-[var(--text-muted)]">
            {designs.length} {designs.length === 1 ? "design" : "designs"}
          </p>
          <Button size="sm" onClick={askForNewDesign}>
            <Plus size={14} />
            New design
          </Button>
        </div>

        <div className="mt-3 flex max-h-[52vh] flex-col gap-1.5 overflow-y-auto">
          {designs.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-[12px] leading-relaxed text-[var(--text-muted)]">
              Nothing saved yet. Use Save to keep this design here.
            </p>
          )}

          {designs.map((design) => {
            const current = design.id === currentDesignId
            const editing = editingId === design.id

            return (
              <div
                key={design.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2",
                  current
                    ? "border-primary/40 bg-primary/[0.05]"
                    : "border-border"
                )}
              >
                {design.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={design.thumbnail}
                    alt=""
                    className="h-16 w-[52px] shrink-0 rounded-md border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-[52px] shrink-0 items-center justify-center rounded-md border border-dashed border-border text-[9px] text-[var(--text-muted)]">
                    No preview
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  {editing ? (
                    <input
                      autoFocus
                      value={draft}
                      aria-label="Design name"
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={() => commitRename(design.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename(design.id)
                        if (event.key === "Escape") setEditingId(null)
                      }}
                      className="w-full rounded-md border border-border bg-card px-1.5 py-1 text-[12px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
                    />
                  ) : (
                    <button
                      type="button"
                      aria-label={`Open ${design.name}`}
                      onClick={() => void openDesign(design.id)}
                      className="block w-full cursor-pointer rounded-md text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="block truncate text-[12px] font-medium text-foreground">
                        {design.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                        {design.artboard.width}×{design.artboard.height} ·{" "}
                        {relativeDate(design.updatedAt)}
                      </span>
                    </button>
                  )}
                </div>

                {current && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Current
                  </span>
                )}

                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    icon={<Pencil size={13} />}
                    label={`Rename ${design.name}`}
                    size="sm"
                    onClick={() => {
                      setEditingId(design.id)
                      setDraft(design.name)
                    }}
                  />
                  <IconButton
                    icon={<Trash2 size={13} />}
                    label={`Delete ${design.name}`}
                    size="sm"
                    tone="danger"
                    onClick={() => askToDelete(design.id, design.name)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
