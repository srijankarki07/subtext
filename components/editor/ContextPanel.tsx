"use client"

import { AtSign, Image as ImageIcon, Quote, Type, X } from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
import EffectsPanel from "@/components/panels/EffectPanel"
import LayersPanel from "@/components/panels/LayersPanel"
import TemplatesPanel from "@/components/panels/TemplatesPanel"
import { useEditorStore } from "@/store/useEditorStore"
import type { EditorTool } from "@/components/editor/ToolRail"

/**
 * The browsing / insertion panel that sits beside the tool rail.
 *
 * It is a white surface on the paper chrome, so a panel reads as a card in the
 * DESIGN/ hierarchy rather than as another slab of chrome.
 *
 * The body is the only scroll region: several panels used to add a second
 * `overflow-y-auto` plus a `pb-24` spacer inside this one, which produced two
 * nested scrollbars and 96px of dead space at the bottom.
 */

const TOOL_COPY: Record<string, { title: string; hint: string }> = {
  text: {
    title: "Text",
    hint: "Add a considered starting point, then refine it on the artboard.",
  },
  media: {
    title: "Media",
    hint: "Add a considered starting point, then refine it on the artboard.",
  },
  templates: {
    title: "Templates",
    hint: "A finished design opinion, not a bundle of settings.",
  },
  cinema: {
    title: "Cinema",
    hint: "Grade the image so the words sit on it comfortably.",
  },
  layers: {
    title: "Layers",
    hint: "Reorder, lock and hide what makes up the artwork.",
  },
  select: {
    title: "Text",
    hint: "Add a considered starting point, then refine it on the artboard.",
  },
}

function AddElement({
  icon,
  eyebrow,
  title,
  onClick,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-black/[0.04] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.99]"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-[var(--text-secondary)] transition-colors group-hover:border-black/15 group-hover:text-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
          {eyebrow}
        </span>
      </span>
    </button>
  )
}

export default function ContextPanel({
  activeTool,
  onClose,
}: {
  activeTool: EditorTool
  onClose: () => void
}) {
  const copy = TOOL_COPY[activeTool] ?? TOOL_COPY.text

  return (
    <aside className="hidden w-[252px] shrink-0 flex-col border-r border-border bg-card select-none lg:flex">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-foreground">
            {copy.title}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
            {copy.hint}
          </p>
        </div>
        <IconButton
          icon={<X size={14} />}
          label="Close panel"
          size="sm"
          onClick={onClose}
        />
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {activeTool === "templates" ? (
          <TemplatesPanel />
        ) : activeTool === "layers" ? (
          <LayersPanel />
        ) : activeTool === "cinema" ? (
          <EffectsPanel />
        ) : (
          <div className="flex flex-col gap-0.5">
            <AddElement
              icon={<Type size={15} />}
              eyebrow="Typography"
              title="Quote"
              onClick={() => useEditorStore.getState().addText("quote")}
            />
            <AddElement
              icon={<Quote size={15} />}
              eyebrow="Typography"
              title="Author"
              onClick={() => useEditorStore.getState().addText("author")}
            />
            <AddElement
              icon={<AtSign size={15} />}
              eyebrow="Typography"
              title="Social handle"
              onClick={() => useEditorStore.getState().addText("handle")}
            />
            <div className="my-2 h-px bg-border" />
            <AddElement
              icon={<ImageIcon size={15} />}
              eyebrow="Media"
              title="Image"
              onClick={() => useEditorStore.getState().addImage()}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
