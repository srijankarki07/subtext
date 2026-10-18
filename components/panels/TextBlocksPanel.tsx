"use client"

import { AtSign, PenTool, Quote, Type } from "lucide-react"

import { useEditorStore } from "@/store/useEditorStore"
import type { TextBlockType } from "@/types/store.types"

/**
 * The Text tool's panel: the blocks a composition is built from.
 *
 * Each one is a different job in a quote card - the words, who said them, where
 * to find them, and the signature - rather than variations on the same thing,
 * which is how the list read when it was four rows of "Typography".
 *
 * Named for the blocks rather than "Text", because
 * `components/panels/TextPanel.tsx` is already the inspector's formatting
 * controls for a *selected* text layer. That one edits; this one inserts.
 *
 * This lived inside `ContextPanel` until the tool registry needed it as a
 * component it could bind to a tool - at which point it had to move out, since
 * the registry importing the panel that imported the registry is a cycle.
 */

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
      className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors outline-none hover:bg-subtle-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.99]"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-[var(--text-secondary)] transition-colors group-hover:border-swatch-edge group-hover:text-foreground">
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

export default function TextBlocksPanel() {
  const blocks: Array<{
    type: TextBlockType
    icon: React.ReactNode
    title: string
    eyebrow: string
  }> = [
    {
      type: "quote",
      icon: <Type size={15} />,
      title: "Quote",
      eyebrow: "The words, in a display serif",
    },
    {
      type: "author",
      icon: <Quote size={15} />,
      title: "Author",
      eyebrow: "Who said it",
    },
    {
      type: "handle",
      icon: <AtSign size={15} />,
      title: "Social handle",
      eyebrow: "Wide, small, quiet",
    },
    {
      type: "signature",
      icon: <PenTool size={15} />,
      title: "Signature",
      eyebrow: "A script name, lower third",
    },
  ]

  return (
    <div className="flex flex-col gap-0.5">
      {blocks.map((block) => (
        <AddElement
          key={block.type}
          icon={block.icon}
          eyebrow={block.eyebrow}
          title={block.title}
          onClick={() => useEditorStore.getState().addText(block.type)}
        />
      ))}
    </div>
  )
}
