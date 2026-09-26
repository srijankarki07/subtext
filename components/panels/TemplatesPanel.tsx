"use client"

import { useState } from "react"
import { Info, LayoutTemplate, Palette, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { CINEMATIC_PRESET_METADATA, CINEMATIC_PRESETS } from "@/lib/filters"
import { TEMPLATES } from "@/lib/templates"
import { useEditorStore } from "@/store/useEditorStore"
import type { Template, TemplateCategory } from "@/types/template.types"
import { cn } from "@/lib/utils"

/**
 * Templates and film-stock grades.
 *
 * Note the previews: each card reconstructs a mini artboard in the DOM from the
 * template's real typography, so the preview is the actual design rather than a
 * screenshot. The mini artboard stays dark because it is standing in for the
 * user's artwork.
 *
 * The nested `overflow-y-auto` + `pb-24` scroll regions are gone; this panel
 * now flows in the panel's single scroll area.
 */

const CATEGORIES: TemplateCategory[] = [
  "All",
  "Cinematic",
  "Editorial",
  "Aesthetic",
  "Bold",
  "Vintage",
]

function categoryTint(category: TemplateCategory) {
  switch (category) {
    case "Cinematic":
      return "bg-gradient-to-tr from-blue-900 via-transparent to-amber-900"
    case "Vintage":
      return "bg-amber-950/40"
    case "Bold":
      return "bg-red-950/30"
    default:
      return "bg-white/[0.05]"
  }
}

function TemplateThumbnailCard({
  template,
  onClick,
}: {
  template: Template
  onClick: () => void
}) {
  const fx = template.effects

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-2 text-left outline-none transition-colors hover:border-black/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.99]"
    >
      {/* Mini artboard, 4:5 */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-workspace">
        <div
          className={cn(
            "absolute inset-0 opacity-20",
            categoryTint(template.category)
          )}
        />

        {fx.vignette && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${fx.vignette.opacity / 100}) 100%)`,
            }}
          />
        )}

        {fx.letterbox && (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-black"
              style={{ height: `${fx.letterbox * 0.8}%` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-black"
              style={{ height: `${fx.letterbox * 0.8}%` }}
            />
          </>
        )}

        {template.texts.map((text, index) => {
          const isQuote = text.type === "quote"
          const preview =
            text.text ||
            (isQuote
              ? '"Your quote here"'
              : text.type === "author"
                ? "— AUTHOR"
                : "@handle")

          return (
            <div
              key={index}
              title={preview}
              className="pointer-events-none absolute max-w-[85%] truncate leading-tight select-none"
              style={{
                left: `${text.left * 100}%`,
                top: `${text.top * 100}%`,
                transform: `translate(${
                  text.originX === "center"
                    ? "-50%"
                    : text.originX === "right"
                      ? "-100%"
                      : "0%"
                }, ${
                  text.originY === "center"
                    ? "-50%"
                    : text.originY === "bottom"
                      ? "-100%"
                      : "0%"
                })`,
                fontFamily: text.fontFamily,
                fontSize: `${Math.max(7, Math.min(13, text.fontSize * 0.16))}px`,
                fontWeight: text.fontWeight as never,
                fontStyle: text.fontStyle,
                color: text.fill,
                textAlign: text.textAlign,
                letterSpacing: text.charSpacing
                  ? `${text.charSpacing * 0.005}px`
                  : undefined,
                opacity: isQuote ? 0.95 : 0.65,
              }}
            >
              {preview}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <span className="truncate text-[12px] font-medium text-foreground">
          {template.name}
        </span>
        <span className="shrink-0 rounded bg-black/[0.05] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
          {template.category}
        </span>
      </div>
    </button>
  )
}

export default function TemplatesPanel() {
  const [activeSubTab, setActiveSubTab] = useState<"layouts" | "luts">("layouts")
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("All")
  const [showInfo, setShowInfo] = useState(true)
  const [selectedLut, setSelectedLut] = useState<string>("None")

  const applyTemplate = useEditorStore((s) => s.applyTemplate)
  const applyPreset = useEditorStore((s) => s.applyPreset)
  const setActiveMobileTab = useEditorStore((s) => s.setActiveMobileTab)

  const filteredTemplates = TEMPLATES.filter(
    (template) =>
      activeCategory === "All" || template.category === activeCategory
  )

  const handleApplyLut = (name: string) => {
    setSelectedLut(name)
    const matrix = CINEMATIC_PRESETS[name]
    if (matrix) applyPreset(matrix)
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        label="Template type"
        value={activeSubTab}
        onChange={setActiveSubTab}
        options={[
          {
            value: "layouts",
            label: "Layouts",
            icon: <LayoutTemplate size={13} aria-hidden="true" />,
          },
          {
            value: "luts",
            label: "Grades",
            icon: <Palette size={13} aria-hidden="true" />,
          },
        ]}
      />

      {showInfo && (
        <div className="relative rounded-lg border border-primary/20 bg-primary/[0.05] p-2.5 pr-9 text-[11px] leading-relaxed text-[var(--text-secondary)]">
          <div className="flex items-start gap-2">
            <Info
              size={14}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-primary"
            />
            <p>
              {activeSubTab === "layouts" ? (
                <>
                  <span className="font-medium text-foreground">Layouts</span>{" "}
                  replace typography, framing and mood. Your existing quote text
                  is preserved.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">Grades</span>{" "}
                  apply a colour matrix to the image only. Text and layout are
                  untouched.
                </>
              )}
            </p>
          </div>
          <IconButton
            icon={<X size={13} />}
            label="Dismiss information"
            size="sm"
            className="absolute top-1.5 right-1.5"
            onClick={() => setShowInfo(false)}
          />
        </div>
      )}

      {activeSubTab === "layouts" && (
        <>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((category) => {
              const active = activeCategory === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={active}
                  className={cn(
                    "cursor-pointer rounded-full px-2.5 py-1 text-[11px] outline-none transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                    active
                      ? "bg-foreground font-medium text-background"
                      : "bg-black/[0.04] text-[var(--text-secondary)] hover:bg-black/[0.07] hover:text-foreground"
                  )}
                >
                  {category}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredTemplates.map((template) => (
              <TemplateThumbnailCard
                key={template.id}
                template={template}
                onClick={() => {
                  applyTemplate(template.id)
                  setActiveMobileTab(null)
                }}
              />
            ))}
          </div>
        </>
      )}

      {activeSubTab === "luts" && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center justify-between px-0.5 text-[11px] text-[var(--text-muted)]">
            {CINEMATIC_PRESET_METADATA.length} film stocks
            <Sparkles size={11} aria-hidden="true" />
          </p>

          {CINEMATIC_PRESET_METADATA.map((meta) => {
            const active = selectedLut === meta.name
            return (
              <button
                key={meta.name}
                type="button"
                onClick={() => handleApplyLut(meta.name)}
                aria-pressed={active}
                className={cn(
                  "group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 text-left outline-none transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.99]",
                  active
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-border hover:bg-black/[0.03]"
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="size-6 shrink-0 rounded-md border border-black/10"
                    style={{ backgroundColor: meta.accentColor }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-foreground">
                      {meta.name}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">
                      {meta.description}
                    </span>
                  </span>
                </span>

                {active && (
                  <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Active
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
