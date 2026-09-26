"use client"

import { useState } from "react"
import { Image as ImageIcon, Type, X } from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
import ColorPanel from "@/components/panels/ColorPanel"
import FontPicker from "@/components/panels/FontPicker"
import ImagePanel from "@/components/panels/ImagePanel"
import TextPanel from "@/components/panels/TextPanel"
import { useEditorStore } from "@/store/useEditorStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Contextual inspector.
 *
 * The controls shown depend on what is selected (design doc §13): nothing
 * selected gives canvas-level quick actions, an image gives image properties,
 * and text gives the Type / Style / Colour tabs. Selection drives complexity,
 * so the panel never shows controls that cannot apply.
 */

type InspectorTab = "font" | "style" | "color"

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "font", label: "Type" },
  { id: "style", label: "Style" },
  { id: "color", label: "Colour" },
]

/** The inspector body. Also rendered into the mobile bottom sheet. */
export function InspectorPanelContent() {
  const activeObject = useEditorStore((s) => s.activeObject)
  const [activeTab, setActiveTab] = useState<InspectorTab>("style")

  if (!activeObject) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-border bg-muted text-[var(--text-muted)]">
          <Type size={16} />
        </div>
        <h3 className="text-[13px] font-semibold text-foreground">
          Nothing selected
        </h3>
        <p className="mt-1 max-w-[210px] text-[12px] leading-relaxed text-[var(--text-muted)]">
          Select something on the artboard to adjust it, or start from one of
          these.
        </p>

        <div className="mt-5 w-full space-y-1.5 border-t border-border pt-4">
          <span className="block pb-1 text-left text-[11px] font-medium text-[var(--text-muted)]">
            Add
          </span>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => useEditorStore.getState().addText("quote")}
          >
            <span>Quote typography</span>
            <span className="text-[10px] text-[var(--text-muted)]">Add</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => useEditorStore.getState().addText("author")}
          >
            <span>Author line</span>
            <span className="text-[10px] text-[var(--text-muted)]">Add</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => useEditorStore.getState().addText("handle")}
          >
            <span>Social handle</span>
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
      </div>
    )
  }

  if (activeObject.type === "image" && !(activeObject as any).isEffect) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold text-foreground">
          Image properties
        </h2>
        <ImagePanel />
      </div>
    )
  }

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
                "relative flex-1 cursor-pointer rounded-t-md pb-2.5 text-[12px] outline-none transition-colors",
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

export default function Inspector({ onClose }: { onClose: () => void }) {
  return (
    <aside className="hidden w-[324px] shrink-0 flex-col border-l border-border bg-card select-none lg:flex">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-foreground">
            Inspector
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
            Properties of the selection
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
        <InspectorPanelContent />
      </div>
    </aside>
  )
}
