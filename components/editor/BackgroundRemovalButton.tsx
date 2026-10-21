"use client"

import type { FabricObject } from "fabric"
import { Loader2, Scissors } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * The background-removal action, shared by the Media panel and the inspector.
 *
 * `target` matters: a composition can hold more than one image, and the action
 * should process the one the user is looking at rather than whichever happens
 * to be first on the canvas. The Media panel passes the primary photo; the
 * inspector passes the selected layer.
 */
export function BackgroundRemovalButton({ target }: { target?: FabricObject }) {
  const state = useEditorStore((s) => s.backgroundRemoval)
  const mode = useEditorStore((s) => s.backgroundRemovalMode)
  const setMode = useEditorStore((s) => s.setBackgroundRemovalMode)
  const removeBackground = useEditorStore((s) => s.removeBackground)

  const busy = state.status === "loading" || state.status === "processing"

  const label =
    state.status === "loading"
      ? state.progress > 0
        ? `Preparing model ${state.progress}%`
        : "Preparing model…"
      : state.status === "processing"
        ? "Removing background…"
        : state.status === "done"
          ? "Background removed"
          : state.status === "error"
            ? "Try again"
            : "Remove background"

  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        label="Subject type"
        size="sm"
        className="w-full"
        value={mode}
        onChange={setMode}
        options={[
          { value: "person", label: "Person" },
          { value: "object", label: "Object" },
        ]}
      />

      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => void removeBackground(target)}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <Scissors size={14} aria-hidden="true" />
        )}
        {label}
      </Button>

      {state.status === "idle" && (
        <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
          Person is tuned for portraits; Object handles products and scenes.
          Both run on this device, and each model loads once.
        </p>
      )}

      {state.status === "error" && state.message && (
        <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
          {state.message}
        </p>
      )}
    </div>
  )
}
