"use client"

import { createElement, useMemo, useState } from "react"
import { Search } from "lucide-react"

import { ColorPopover } from "@/components/ui/color-popover"
import { Section } from "@/components/ui/section"
import {
  ELEMENT_CATEGORIES,
  filterElements,
  type ElementDef,
} from "@/lib/elements"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * The Elements tool's panel.
 *
 * One tile per element, grouped by kind and searchable by what it is rather
 * than only by its name. The preview and the inserted object are built from the
 * same node data, so a tile cannot show something different from what lands on
 * the artboard.
 */

/** SVG attributes are kebab-case; React's props are camelCase. */
const reactAttribute = (name: string) =>
  name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

function Preview({ def }: { def: ElementDef }) {
  const paint =
    def.paint === "fill"
      ? { fill: "currentColor", stroke: "none" }
      : {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
        }

  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" {...paint}>
      {def.nodes.map(([tag, attrs], index) =>
        createElement(tag, {
          key: index,
          ...Object.fromEntries(
            Object.entries(attrs).map(([name, value]) => [
              reactAttribute(name),
              value,
            ])
          ),
        })
      )}
    </svg>
  )
}

function ElementTile({
  def,
  onInsert,
}: {
  def: ElementDef
  onInsert: () => void
}) {
  return (
    <button
      type="button"
      aria-label={`Add ${def.name}`}
      onClick={onInsert}
      className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-1 py-2.5 text-[var(--text-muted)] transition-colors outline-none hover:border-swatch-edge hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Preview def={def} />
      <span className="w-full truncate text-center text-[10px]">
        {def.name}
      </span>
    </button>
  )
}

export default function ElementsPanel() {
  const addElement = useEditorStore((s) => s.addElement)
  const setElementColor = useEditorStore((s) => s.setElementColor)
  const [query, setQuery] = useState("")
  const [colour, setColour] = useState("#FFFFFF")

  const results = useMemo(() => filterElements(query), [query])

  // Applies to the selected element, if there is one, and sets the colour the
  // next insert will use either way.
  const applyColour = (next: string) => {
    setColour(next)
    setElementColor(next)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search
          size={13}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Shapes, lines, icons"
          aria-label="Search elements"
          className="h-8 w-full rounded-lg border border-border bg-card pr-2 pl-7 text-[12px] text-foreground outline-none placeholder:text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[var(--text-secondary)]">Colour</span>
        <ColorPopover
          label="Element colour"
          value={colour}
          onChange={applyColour}
        />
      </div>

      {results.length === 0 && (
        <p className="px-1 text-[12px] text-[var(--text-muted)]">
          Nothing matches “{query}”.
        </p>
      )}

      {ELEMENT_CATEGORIES.map((category) => {
        const items = results.filter((element) => element.category === category)
        if (items.length === 0) return null

        return (
          <Section key={category} title={category} bare>
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((def) => (
                <ElementTile
                  key={def.id}
                  def={def}
                  onInsert={() => void addElement(def.id, colour)}
                />
              ))}
            </div>
          </Section>
        )
      })}
    </div>
  )
}
