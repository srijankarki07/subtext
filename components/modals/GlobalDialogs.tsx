"use client"

import { useEditorStore } from "@/store/useEditorStore"
import { AlertCircle, AlertTriangle, X } from "lucide-react"

export default function GlobalDialogs() {
  const { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog } = useEditorStore()

  return (
    <>
      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[300] flex animate-in items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-md duration-150 fade-in">
          <div
            className="relative w-full max-w-sm animate-in overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] p-5 text-white shadow-2xl duration-150 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                <AlertTriangle size={16} />
              </div>
              <h2 className="text-[13px] font-semibold text-white/90">
                {confirmDialog.title}
              </h2>
              <button
                onClick={() => setConfirmDialog(null)}
                className="ml-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-white/30 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
            
            <div className="py-4">
              <p className="text-[12px] leading-relaxed text-white/60">
                {confirmDialog.message}
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
              <button
                onClick={() => {
                  setConfirmDialog(null)
                  if (confirmDialog.onCancel) confirmDialog.onCancel()
                }}
                className="cursor-pointer rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {confirmDialog.cancelText || "Cancel"}
              </button>
              <button
                onClick={() => {
                  setConfirmDialog(null)
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm()
                }}
                className="cursor-pointer rounded-md bg-[#D6B47A] px-4 py-2 text-[11px] font-semibold text-[#151512] transition-colors hover:bg-[#E4C88F]"
              >
                {confirmDialog.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog */}
      {alertDialog && (
        <div className="fixed inset-0 z-[300] flex animate-in items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-md duration-150 fade-in">
          <div
            className="relative w-full max-w-sm animate-in overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] p-5 text-white shadow-2xl duration-150 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                <AlertCircle size={16} />
              </div>
              <h2 className="text-[13px] font-semibold text-white/90">
                {alertDialog.title}
              </h2>
            </div>
            
            <div className="py-4">
              <p className="text-[12px] leading-relaxed text-white/60">
                {alertDialog.message}
              </p>
            </div>

            <div className="flex justify-end border-t border-white/[0.06] pt-4">
              <button
                onClick={() => {
                  setAlertDialog(null)
                  if (alertDialog.onClose) alertDialog.onClose()
                }}
                className="cursor-pointer rounded-md bg-white/[0.1] px-4 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.15]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
