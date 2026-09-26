"use client"

import { CINEMATIC_PRESET_METADATA, CINEMATIC_PRESETS } from "@/lib/filters"
import { TEMPLATES } from "@/lib/templates"
import { useEditorStore } from "@/store/useEditorStore"
import { Template, TemplateCategory } from "@/types/template.types"
import { Info, LayoutTemplate, Palette, Sparkles, X } from "lucide-react"
import { useState } from "react"

const CATEGORIES: TemplateCategory[] = [
  "All",
  "Cinematic",
  "Editorial",
  "Aesthetic",
  "Bold",
  "Vintage",
]

// Thumbnail Mockup Card
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
      onClick={onClick}
      className="cursor-pointer group relative flex w-full flex-col overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] p-2 text-left transition-all hover:border-[#D6B47A]/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-[0.98]"
    >
      {/* 1. MINI ARTBOARD CANVAS PREVIEW (4:5 Aspect Ratio) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md border border-white/[0.04] bg-[#1C1C1E]">
        {/* Atmosphere tint */}
        <div
          className={`absolute inset-0 opacity-20 ${
            template.category === "Cinematic"
              ? "bg-gradient-to-tr from-blue-900 via-transparent to-amber-900"
              : template.category === "Vintage"
                ? "bg-amber-950/40"
                : template.category === "Bold"
                  ? "bg-red-950/30"
                  : "bg-white/[0.05]"
          }`}
        />

        {/* Mini Vignette */}
        {fx.vignette && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${fx.vignette.opacity / 100}) 100%)`,
            }}
          />
        )}

        {/* Mini Widescreen Letterbox Bars */}
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

        {/* Mini Positioned Text Elements */}
        {template.texts.map((t, i) => {
          const isQuote = t.type === "quote"
          return (
            <div
              key={i}
              className="pointer-events-none absolute max-w-[85%] truncate leading-tight select-none"
              style={{
                left: `${t.left * 100}%`,
                top: `${t.top * 100}%`,
                transform: `translate(${
                  t.originX === "center"
                    ? "-50%"
                    : t.originX === "right"
                      ? "-100%"
                      : "0%"
                }, ${
                  t.originY === "center"
                    ? "-50%"
                    : t.originY === "bottom"
                      ? "-100%"
                      : "0%"
                })`,
                fontFamily: t.fontFamily,
                fontSize: `${Math.max(7, Math.min(13, t.fontSize * 0.16))}px`,
                fontWeight: t.fontWeight as any,
                fontStyle: t.fontStyle,
                color: t.fill,
                textAlign: t.textAlign,
                letterSpacing: t.charSpacing
                  ? `${t.charSpacing * 0.005}px`
                  : undefined,
                opacity: isQuote ? 0.95 : 0.65,
              }}
            >
              {t.text ||
                (isQuote
                  ? '"Your quote here"'
                  : t.type === "author"
                    ? "— AUTHOR"
                    : "@handle")}
            </div>
          )
        })}
      </div>

      {/* 2. CARD FOOTER INFO */}
      <div className="mt-2 flex items-center justify-between px-1">
        <span className="truncate text-[11px] font-semibold text-white/80 group-hover:text-white">
          {template.name}
        </span>
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-medium tracking-wider text-white/40 uppercase">
          {template.category}
        </span>
      </div>
    </button>
  )
}

export default function TemplatesPanel() {
  const [activeSubTab, setActiveSubTab] = useState<"layouts" | "luts">(
    "layouts"
  )
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("All")
  const [showInfo, setShowInfo] = useState(true)
  const [selectedLut, setSelectedLut] = useState<string>("None")

  const { applyTemplate, applyPreset, setActiveMobileTab } = useEditorStore()

  const filteredTemplates = TEMPLATES.filter(
    (t) => activeCategory === "All" || t.category === activeCategory
  )

  const handleApplyTemplate = (id: string) => {
    applyTemplate(id)
    setActiveMobileTab(null)
  }

  const handleApplyLut = (name: string) => {
    setSelectedLut(name)
    const matrix = CINEMATIC_PRESETS[name]
    if (matrix) applyPreset(matrix)
  }

  return (
    <div className="flex h-full flex-col font-sans">
      {/* 1. TOP SEGMENTED CONTROL: LAYOUTS vs COLOR GRADES */}
      <div className="mb-3 flex shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] p-1">
        <button
          onClick={() => setActiveSubTab("layouts")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-semibold transition-all ${
            activeSubTab === "layouts"
              ? "bg-white text-black shadow-md"
              : "text-white/40 hover:text-white"
          }`}
        >
          <LayoutTemplate size={13} />
          Full Layouts
        </button>
        <button
          onClick={() => setActiveSubTab("luts")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-semibold transition-all ${
            activeSubTab === "luts"
              ? "bg-white text-black shadow-md"
              : "text-white/40 hover:text-white"
          }`}
        >
          <Palette size={13} />
          Color Grades
        </button>
      </div>

      {/* 2. DYNAMIC (i) INFO BANNER */}
      {showInfo && (
        <div className="relative mb-3 shrink-0 rounded-md border border-blue-500/20 bg-blue-500/[0.07] p-3 text-[11px] leading-relaxed text-blue-200/90">
          <div className="flex items-start gap-2.5">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-400" />
            <div className="flex-1 pr-4">
              {activeSubTab === "layouts" ? (
                <span>
                  <strong className="font-semibold text-white">
                    Full Layouts:
                  </strong>{" "}
                  Replaces typography styling, framing, and mood.{" "}
                  <span className="text-blue-300/80">
                    Your existing quote text will be preserved!
                  </span>
                </span>
              ) : (
                <span>
                  <strong className="font-semibold text-white">
                    Film Stock LUTs:
                  </strong>{" "}
                  Applies color matrix grades strictly to the background image.{" "}
                  <span className="text-blue-300/80">
                    Text and layout stay untouched.
                  </span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowInfo(false)}
            title="Dismiss info"
            className="absolute top-2.5 right-2.5 text-blue-300/40 transition-colors hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 3A. LAYOUT TEMPLATES VIEW */}
      {activeSubTab === "layouts" && (
        <>
          {/* Category Pills */}
          <div className="mb-3 flex shrink-0 flex-wrap gap-1 px-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-[#D6B47A] font-semibold text-[#101010]"
                    : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template Cards Grid */}
          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 pb-24">
            {filteredTemplates.map((template) => (
              <TemplateThumbnailCard
                key={template.id}
                template={template}
                onClick={() => handleApplyTemplate(template.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* 3B. COLOR GRADES (LUTs) VIEW */}
      {activeSubTab === "luts" && (
        <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 pb-24">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[9px] font-semibold tracking-wider text-white/40 uppercase">
              12 Film Stock LUTs
            </span>
            <Sparkles size={11} className="text-[#D6B47A]/70" />
          </div>

          <div className="grid grid-cols-1 gap-2">
            {CINEMATIC_PRESET_METADATA.map((meta) => {
              const isActive = selectedLut === meta.name
              return (
                <button
                  key={meta.name}
                  onClick={() => handleApplyLut(meta.name)}
                  className={`group relative flex w-full items-center justify-between rounded-md border p-3 text-left transition-all active:scale-[0.98] ${
                    isActive
                      ? "border-[#D6B47A]/60 bg-[#D6B47A]/10 shadow-[0_0_15px_rgba(214,180,122,0.1)]"
                      : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-7 w-7 shrink-0 rounded-md border border-white/10 shadow-inner"
                      style={{ backgroundColor: meta.accentColor }}
                    />
                    <div>
                      <div className="text-[12px] font-semibold text-white/90 group-hover:text-white">
                        {meta.name}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {meta.description}
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <span className="rounded-full bg-[#D6B47A] px-2 py-0.5 text-[8px] font-bold text-black uppercase">
                      Active
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
