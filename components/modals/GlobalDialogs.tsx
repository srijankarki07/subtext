"use client"

import { AlertCircle, AlertTriangle, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * Confirm and alert dialogs.
 *
 * Previously two near-identical hand-rolled overlays with no `role="dialog"`,
 * no `aria-modal`, no focus trap, no focus-on-open, no Escape, and a dead
 * `stopPropagation` where backdrop dismissal was clearly intended. Both now
 * share one shell built on the Dialog primitive, which supplies all of that,
 * and the copy-paste between the two variants is gone.
 */

export default function GlobalDialogs() {
  const confirmDialog = useEditorStore((s) => s.confirmDialog)
  const setConfirmDialog = useEditorStore((s) => s.setConfirmDialog)
  const alertDialog = useEditorStore((s) => s.alertDialog)
  const setAlertDialog = useEditorStore((s) => s.setAlertDialog)

  const closeConfirm = () => {
    const onCancel = confirmDialog?.onCancel
    setConfirmDialog(null)
    onCancel?.()
  }

  const closeAlert = () => {
    const onClose = alertDialog?.onClose
    setAlertDialog(null)
    onClose?.()
  }

  return (
    <>
      <Dialog
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => {
          if (!open) closeConfirm()
        }}
      >
        {confirmDialog && (
          <DialogContent>
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-saffron)]/10 text-[var(--color-saffron)]">
                <AlertTriangle size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogDescription>{confirmDialog.message}</DialogDescription>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeConfirm}
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition-colors hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeConfirm}>
                {confirmDialog.cancelText || "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const onConfirm = confirmDialog.onConfirm
                  setConfirmDialog(null)
                  onConfirm?.()
                }}
              >
                {confirmDialog.confirmText || "Confirm"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={Boolean(alertDialog)}
        onOpenChange={(open) => {
          if (!open) closeAlert()
        }}
      >
        {alertDialog && (
          <DialogContent>
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <AlertCircle size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle>{alertDialog.title}</DialogTitle>
                <DialogDescription>{alertDialog.message}</DialogDescription>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button size="sm" onClick={closeAlert}>
                {alertDialog.confirmText || "OK"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
