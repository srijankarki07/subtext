"use client"

import { FONTS, FontCategory } from "@/lib/fonts"
import { useEditorStore } from "@/store/editorStore"
import { IText } from "fabric"
import { Check, Crown, Search, Sparkles, X } from "lucide-react"
import { useEffect, useMemo, useReducer, useRef, useState } from "react"

type FontFilter = "All" | "Recommended" | "Premium" | FontCategory

const CATEGORIES: FontFilter[] = [
  "All",
  "Recommended",
  "Premium",
  "Serif",
  "Sans-serif",
  "Display",
  "Script",
  "Monospace",
]

export default function FontPicker() {
  const { canvas, activeObject, applyTextStyle, getActiveSelectionStyle } =
    useEditorStore()

  const [activeCategory, setActiveCategory] = useState<FontFilter>("All")

  const [searchQuery, setSearchQuery] = useState("")

  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  /*
   * Reference to the scrollable font list.
   *
   * We can use this later if we want the current font card
   * to scroll into view.
   */
  const fontListRef = useRef<HTMLDivElement>(null)

  /*
   * Find the current Fabric font.
   */
  const currentFontFamily =
    activeObject?.type === "i-text"
      ? getActiveSelectionStyle("fontFamily")
      : undefined

  /*
   * Find the corresponding FontDef.
   */
  const currentFont = useMemo(() => {
    if (!currentFontFamily) return undefined

    return FONTS.find((font) => font.fabricFamily === currentFontFamily)
  }, [currentFontFamily])

  /*
   * Filter fonts.
   */
  const filteredFonts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return FONTS.filter((font) => {
      let matchesCategory = true

      if (
        activeCategory !== "All" &&
        activeCategory !== "Recommended" &&
        activeCategory !== "Premium"
      ) {
        matchesCategory = font.category === activeCategory
      }

      if (activeCategory === "Premium") {
        matchesCategory = font.premium === true
      }

      if (activeCategory === "Recommended") {
        matchesCategory =
          font.premium === true ||
          font.useCases?.some((useCase) =>
            [
              "hero",
              "title",
              "poster",
              "cinematic",
              "fashion",
              "luxury",
            ].includes(useCase)
          ) === true
      }

      const matchesSearch =
        !query ||
        font.name.toLowerCase().includes(query) ||
        font.category.toLowerCase().includes(query) ||
        font.description?.toLowerCase().includes(query) ||
        font.useCases?.some((useCase) => useCase.toLowerCase().includes(query))

      return matchesCategory && matchesSearch
    }).sort((a, b) => {
      if (activeCategory === "All") {
        if (a.premium && !b.premium) return -1
        if (!a.premium && b.premium) return 1
      }

      return a.name.localeCompare(b.name)
    })
  }, [activeCategory, searchQuery])

  /*
   * Nothing selected / wrong object type.
   */
  if (!activeObject || activeObject.type !== "i-text") {
    return null
  }

  const textObj = activeObject as IText

  /*
   * Change font in Fabric.
   */
  const handleFontChange = (fabricFamily: string) => {
    if (!activeObject || !canvas) return
    applyTextStyle("fontFamily", fabricFamily)
    forceUpdate()
  }

  /*
   * Clear search.
   */
  const clearSearch = () => {
    setSearchQuery("")
  }

  /*
   * If the selected font is hidden because of the current
   * category/search, we don't want the UI to become confusing.
   *
   * Resetting to "All" is optional. I recommend NOT doing it
   * automatically because it would be surprising to the user.
   */
  useEffect(() => {
    // Intentionally empty.
    // Kept here as a convenient place for future font-selection
    // synchronization with external Fabric events.
  }, [currentFontFamily])

  return (
    <div className="flex h-full min-h-0 flex-col pt-2">
      {/* SEARCH */}

      <div className="relative mb-3 shrink-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search size={14} className="text-white/40" />
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search fonts..."
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pr-9 pl-9 text-[13px] text-white placeholder-white/40 transition-all focus:border-white/20 focus:bg-white/[0.06] focus:outline-none"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 transition-colors hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* CURRENT FONT */}

      {currentFont && (
        <div className="mb-3 shrink-0 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.10] via-white/[0.04] to-transparent p-3.5 shadow-[0_0_25px_rgba(59,130,246,0.05)]">
          {/* Header */}
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-blue-400" />

              <span className="text-[9px] font-semibold tracking-[0.15em] text-blue-300/70 uppercase">
                Current Font
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 text-[9px] font-medium text-blue-300">
              <Check size={9} />
              Selected
            </div>
          </div>

          {/* Font preview */}
          <div
            className="truncate text-[25px] leading-none text-white"
            style={{
              fontFamily: currentFont.cssVariable,
            }}
          >
            {currentFont.name}
          </div>

          {/* Actual typography preview */}
          <div
            className="mt-2 truncate text-[13px] leading-tight text-white/45"
            style={{
              fontFamily: currentFont.cssVariable,
            }}
          >
            The Art of the Frame
          </div>

          {/* Metadata */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[9px] font-medium tracking-[0.12em] text-white/30 uppercase">
              {currentFont.category}
            </span>

            {currentFont.premium && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-white/20" />

                <span className="flex items-center gap-1 text-[9px] text-amber-300/70">
                  <Crown size={9} />
                  Premium
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY FILTERS */}

      <div className="mb-3 shrink-0 border-b border-white/[0.05] pb-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                    : "bg-white/[0.04] text-white/60 hover:bg-white/[0.1] hover:text-white"
                } `}
              >
                {category === "Recommended" && <Sparkles size={11} />}

                {category === "Premium" && <Crown size={11} />}

                {category}
              </button>
            )
          })}
        </div>
      </div>

      {/* RESULT COUNT */}

      <div className="mb-2 flex shrink-0 items-center justify-between px-1">
        <span className="text-[10px] tracking-wider text-white/30 uppercase">
          {filteredFonts.length} {filteredFonts.length === 1 ? "font" : "fonts"}
        </span>

        {activeCategory === "Recommended" && (
          <span className="flex items-center gap-1 text-[10px] text-blue-400/70">
            <Sparkles size={10} />
            Curated
          </span>
        )}
      </div>

      {/* SCROLLABLE FONT LIST */}

      <div
        ref={fontListRef}
        className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-2"
      >
        {filteredFonts.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mb-2 text-[13px] text-white/40">No fonts found</div>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setActiveCategory("All")
              }}
              className="text-[11px] text-blue-400 transition-colors hover:text-blue-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredFonts.map((font) => {
            const isActive = currentFontFamily === font.fabricFamily

            return (
              <button
                key={font.id}
                type="button"
                onClick={() => handleFontChange(font.fabricFamily)}
                className={`group relative flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                  isActive
                    ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.08)]"
                    : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.06]"
                } `}
              >
                {/* Font information */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="block truncate text-[19px] leading-tight text-white/90"
                      style={{
                        fontFamily: font.cssVariable,
                      }}
                    >
                      {font.name}
                    </span>

                    {font.premium && (
                      <span
                        title="Premium font"
                        className="flex shrink-0 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10 p-1 text-amber-300"
                      >
                        <Crown size={9} />
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[9px] font-medium tracking-[0.12em] text-white/30 uppercase">
                      {font.category}
                    </span>

                    {font.description && (
                      <>
                        <span className="h-0.5 w-0.5 rounded-full bg-white/20" />

                        <span className="max-w-[180px] truncate text-[9px] text-white/25">
                          {font.description}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Selected state */}
                {isActive && (
                  <div className="ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                    <Check size={11} />
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
