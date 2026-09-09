"use client"

import { CINEMATIC_PRESET_METADATA, CINEMATIC_PRESETS } from "@/lib/filters"
import { TEMPLATES } from "@/lib/templates"
import { useEditorStore } from "@/store/useEditorStore"
import { TemplateCategory } from "@/types/template.types"
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
      <div className="mb-3 flex shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
        <button
          onClick={() => setActiveSubTab("layouts")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-all ${
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
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-all ${
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
        <div className="relative mb-3.5 shrink-0 rounded-xl border border-blue-500/20 bg-blue-500/[0.07] p-3 text-[11px] leading-relaxed text-blue-200/90">
          <div className="flex items-start gap-2.5">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-400" />
            <div className="flex-1 pr-4">
              {activeSubTab === "layouts" ? (
                <span>
                  <strong className="font-semibold text-white">
                    Full Scene Presets:
                  </strong>{" "}
                  Applies typography styling, framing, positioning, and mood.{" "}
                  <span className="text-blue-300/70">
                    Replaces current text layers.
                  </span>
                </span>
              ) : (
                <span>
                  <strong className="font-semibold text-white">
                    Film Stock LUTs:
                  </strong>{" "}
                  Applies color matrix grades strictly to the background image.{" "}
                  <span className="text-blue-300/70">
                    Leaves text and layout untouched.
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
          <div className="custom-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 pb-24">
            {filteredTemplates.map((template) => {
              const primaryText = template.texts[0]
              return (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template.id)}
                  className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05] active:scale-[0.98]"
                >
                  <div
                    className={`absolute inset-0 opacity-10 transition-opacity group-hover:opacity-25 ${
                      template.category === "Cinematic"
                        ? "bg-gradient-to-t from-blue-900 to-transparent"
                        : template.category === "Vintage"
                          ? "bg-[#8B4513]"
                          : template.category === "Bold"
                            ? "bg-red-600"
                            : "bg-[#D6B47A]"
                    }`}
                  />
                  <span
                    className="relative z-10 text-[18px] text-white transition-transform group-hover:scale-105"
                    style={{
                      fontFamily: primaryText?.fontFamily,
                      fontWeight: primaryText?.fontWeight as any,
                      fontStyle: primaryText?.fontStyle,
                    }}
                  >
                    {template.name}
                  </span>
                  <div className="relative z-10 mt-1.5 flex items-center gap-2">
                    <span className="text-[8px] font-semibold tracking-wider text-white/40 uppercase">
                      {template.category}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="text-[8px] text-white/30">
                      {template.texts.length} layer
                      {template.texts.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              )
            })}
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
                  className={`group relative flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                    isActive
                      ? "border-[#D6B47A]/60 bg-[#D6B47A]/10 shadow-[0_0_15px_rgba(214,180,122,0.1)]"
                      : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-7 w-7 shrink-0 rounded-lg border border-white/10 shadow-inner"
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
