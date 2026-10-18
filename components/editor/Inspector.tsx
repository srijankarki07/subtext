"use client"

import { useState } from "react"
import {
  Frame,
  Image as ImageIcon,
  Layers3,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
import ColorPanel from "@/components/panels/ColorPanel"
import FontPicker from "@/components/panels/FontPicker"
import ImagePanel from "@/components/panels/ImagePanel"
import TextPanel from "@/components/panels/TextPanel"
import { useEditorStore } from "@/store/useEditorStore"
import { Button } from "@/components/ui/button"
import { classifySelection } from "@/lib/selection"
import { cn } from "@/lib/utils"
import { openToolLabel, type EditorTool } from "@/lib/tools"

/**
 * Contextual inspector.
 *
 * The controls shown depend on what is selected (design doc §13). Selection
 * drives complexity, so the panel never shows controls that cannot apply - and
 * that has to include the cases where the honest answer is "not here": an effect
 * layer is adjusted by the Cinema panel, so the inspector says which layer it is
 * and offers to take you there, rather than offering it font controls.
 *
 * Five states, all resolved by `classifySelection` so the rules are testable
 * without a browser: nothing, text, image, effect layer, and a group.
 */

type InspectorTab = "font" | "style" | "color"

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "font", label: "Type" },
  { id: "style", label: "Style" },
  { id: "color", label: "Colour" },
]

/** The one-line description of what is selected, shown under the title. */
export function useSelectionSummary() {
  const selectedObjects = useEditorStore((s) => s.selectedObjects)
  return classifySelection(selectedObjects)
}

/**
 * State for a selection with no editable properties here.
 *
 * Used by effect layers and unrecognised layers. It names what is selected and
 * either hands over to the panel that owns it or says plainly that there is
 * nothing to change - both better than a tab of controls that do nothing.
 */
function InertState({
  label,
  hint,
  onOpenTool,
  tool,
  toolLabel,
}: {
  label: string
  hint: string
  onOpenTool?: (tool: EditorTool) => void
  tool?: EditorTool
  toolLabel?: string
}) {
  const selectedObjects = useEditorStore((s) => s.selectedObjects)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
        {hint}
      </p>

      <div className="space-y-1.5">
        {tool && onOpenTool && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => onOpenTool(tool)}
          >
            <Sparkles size={13} />
            {toolLabel ?? "Open its controls"}
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-destructive"
          onClick={() => useEditorStore.getState().deleteActiveObject()}
        >
          <Trash2 size={13} />
          Delete {label.toLowerCase()}
        </Button>
      </div>
    </div>
  )
}

/** The Add block, shown when nothing is selected. */
function AddBlock() {
  const addText = (type: "quote" | "author" | "handle" | "signature") =>
    useEditorStore.getState().addText(type)

  return (
    <div className="mt-5 w-full space-y-1.5 border-t border-border pt-4">
      <span className="block pb-1 text-left text-[11px] font-medium text-[var(--text-muted)]">
        Add
      </span>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => addText("quote")}
      >
        <span>Quote typography</span>
        <span className="text-[10px] text-[var(--text-muted)]">Add</span>
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => addText("author")}
      >
        <span>Author line</span>
        <span className="text-[10px] text-[var(--text-muted)]">Add</span>
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => addText("handle")}
      >
        <span>Social handle</span>
        <span className="text-[10px] text-[var(--text-muted)]">Add</span>
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => addText("signature")}
      >
        <span>Signature</span>
        <span className="text-[10px] text-[var(--text-muted)]">Add</span>
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => useEditorStore.getState().addImage()}
      >
        <span className="flex items-center gap-1.5">
          <ImageIcon size={13} />
          Artwork or photo
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">Add</span>
      </Button>
    </div>
  )
}

/**
 * The inspector body. Also rendered into the mobile bottom sheet, which is why
 * it takes the tool-switch callback rather than reaching for editor state.
 */
export function InspectorPanelContent({
  onOpenTool,
}: {
  onOpenTool?: (tool: EditorTool) => void
}) {
  const activeObject = useEditorStore((s) => s.activeObject)
  const [activeTab, setActiveTab] = useState<InspectorTab>("style")
  const summary = useSelectionSummary()

  if (summary.kind === "none") {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-border bg-muted text-[var(--text-muted)]">
          <Frame size={16} />
        </div>
        <h3 className="text-[13px] font-semibold text-foreground">
          {summary.label}
        </h3>
        <p className="mt-1 max-w-[210px] text-[12px] leading-relaxed text-[var(--text-muted)]">
          {summary.hint}
        </p>
        <AddBlock />
      </div>
    )
  }

  if (summary.kind === "effect" || summary.kind === "other") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-subtle text-[var(--text-secondary)]">
            <Layers3 size={13} />
          </span>
          <span className="text-[13px] font-semibold text-foreground">
            {summary.label}
          </span>
        </div>
        <InertState
          label={summary.label}
          hint={summary.hint}
          // Only the effect layers have a home to send you to; an unrecognised
          // layer does not, and inventing one would be worse than saying so.
          tool={summary.kind === "effect" ? "cinema" : undefined}
          toolLabel={openToolLabel("cinema")}
          onOpenTool={onOpenTool}
        />
      </div>
    )
  }

  if (summary.kind === "multi") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-subtle text-[var(--text-secondary)]">
            <Layers3 size={13} />
          </span>
          <span className="text-[13px] font-semibold text-foreground">
            {summary.label}
          </span>
        </div>
        <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
          {summary.hint}
        </p>
        <div className="space-y-1.5">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              const store = useEditorStore.getState()
              store.canvas?.discardActiveObject()
              store.canvas?.requestRenderAll()
              store.setSelection([])
            }}
          >
            Deselect all
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive"
            onClick={() => useEditorStore.getState().deleteActiveObject()}
          >
            <Trash2 size={13} />
            Delete {summary.count} layers
          </Button>
        </div>
      </div>
    )
  }

  if (summary.kind === "image") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-subtle text-[var(--text-secondary)]">
            <ImageIcon size={13} />
          </span>
          <span className="text-[13px] font-semibold text-foreground">
            {summary.label}
          </span>
        </div>
        <ImagePanel />
      </div>
    )
  }

  // Text.
  if (!activeObject) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="tablist"
        aria-label="Text properties"
        className="mb-4 flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex-1 cursor-pointer rounded-t-md pb-2.5 text-[12px] transition-colors outline-none",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                selected
                  ? "font-semibold text-foreground"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {tab.label}
              {selected && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {activeTab === "font" && <FontPicker />}
        {activeTab === "style" && <TextPanel />}
        {activeTab === "color" && <ColorPanel />}
      </div>
    </div>
  )
}

export default function Inspector({
  onClose,
  onOpenTool,
}: {
  onClose: () => void
  onOpenTool?: (tool: EditorTool) => void
}) {
  const summary = useSelectionSummary()

  return (
    <aside className="hidden w-[324px] shrink-0 flex-col border-l border-border bg-card select-none lg:flex">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="min-w-0">
          {/* The subtitle names what is selected rather than repeating the
              heading, so the panel always answers "what am I looking at?" */}
          <h2 className="truncate text-[13px] font-semibold text-foreground">
            {summary.label}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
            {summary.count === 0
              ? "Canvas properties"
              : summary.count > 1
                ? `${summary.count} layers`
                : "Properties of the selection"}
          </p>
        </div>
        <IconButton
          icon={<X size={14} />}
          label="Close inspector"
          size="sm"
          onClick={onClose}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <InspectorPanelContent onOpenTool={onOpenTool} />
      </div>
    </aside>
  )
}
