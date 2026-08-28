"use client"

import { useState, useReducer, useMemo, useRef, useEffect } from "react"

import { useEditorStore } from "@/store/editorStore"
import { FONTS, FontCategory, FontDef } from "@/lib/fonts"

import { IText } from "fabric"

import { Search, X, Sparkles, Crown, Check, Clock3 } from "lucide-react"

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

const RECENT_FONTS_STORAGE_KEY = "cinemate-recent-fonts"

const MAX_RECENT_FONTS = 5

export default function FontPicker() {
  const { canvas, activeObject } = useEditorStore()

  const [activeCategory, setActiveCategory] = useState<FontFilter>("All")

  const [searchQuery, setSearchQuery] = useState("")

  const [recentFontIds, setRecentFontIds] = useState<string[]>([])

  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  const fontListRef = useRef<HTMLDivElement>(null)

  // ============================================================
  // LOAD RECENT FONTS
  // ============================================================

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_FONTS_STORAGE_KEY)

      if (!stored) return

      const parsed: unknown = JSON.parse(stored)

      if (!Array.isArray(parsed)) return

      /*
       * Only keep IDs that still exist in FONTS.
       *
       * This protects against old localStorage data
       * if fonts are removed/renamed in the future.
       */
      const validIds = parsed.filter(
        (id): id is string =>
          typeof id === "string" && FONTS.some((font) => font.id === id)
      )

      setRecentFontIds(validIds.slice(0, MAX_RECENT_FONTS))
    } catch {
      /*
       * Ignore malformed localStorage.
       */
      setRecentFontIds([])
    }
  }, [])

  // ============================================================
  // SAVE RECENT FONTS
  // ============================================================

  useEffect(() => {
    try {
      localStorage.setItem(
        RECENT_FONTS_STORAGE_KEY,
        JSON.stringify(recentFontIds)
      )
    } catch {
      /*
       * localStorage can fail in private browsing
       * or restricted environments.
       *
       * Font selection should still work.
       */
    }
  }, [recentFontIds])

  // ============================================================
  // CURRENT FONT
  // ============================================================

  const currentFontFamily =
    activeObject?.type === "i-text"
      ? (activeObject as IText).get("fontFamily")
      : undefined

  const currentFont = useMemo(() => {
    if (!currentFontFamily) return undefined

    return FONTS.find((font) => font.fabricFamily === currentFontFamily)
  }, [currentFontFamily])

  // ============================================================
  // RECENT FONT OBJECTS
  // ============================================================

  const recentFonts = useMemo(() => {
    return recentFontIds
      .map((id) => FONTS.find((font) => font.id === id))
      .filter((font): font is FontDef => Boolean(font))
  }, [recentFontIds])

  // ============================================================
  // FILTERED FONT LIST
  // ============================================================

  const filteredFonts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return FONTS.filter((font) => {
      let matchesCategory = true

      // ------------------------------------------------------
      // Normal category
      // ------------------------------------------------------

      if (
        activeCategory !== "All" &&
        activeCategory !== "Recommended" &&
        activeCategory !== "Premium"
      ) {
        matchesCategory = font.category === activeCategory
      }

      // ------------------------------------------------------
      // Premium
      // ------------------------------------------------------

      if (activeCategory === "Premium") {
        matchesCategory = font.premium === true
      }

      // ------------------------------------------------------
      // Recommended
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // Search
      // ------------------------------------------------------

      const matchesSearch =
        !query ||
        font.name.toLowerCase().includes(query) ||
        font.category.toLowerCase().includes(query) ||
        font.description?.toLowerCase().includes(query) ||
        font.useCases?.some((useCase) => useCase.toLowerCase().includes(query))

      return matchesCategory && matchesSearch
    }).sort((a, b) => {
      /*
       * Premium fonts first in the default view.
       */
      if (activeCategory === "All") {
        if (a.premium && !b.premium) {
          return -1
        }

        if (!a.premium && b.premium) {
          return 1
        }
      }

      return a.name.localeCompare(b.name)
    })
  }, [activeCategory, searchQuery])

  // ============================================================
  // UPDATE RECENT FONTS
  // ============================================================

  const addToRecentFonts = (fontId: string) => {
    setRecentFontIds((current) => {
      /*
       * Remove existing occurrence first.
       */
      const withoutCurrent = current.filter((id) => id !== fontId)

      /*
       * Put selected font at front.
       */
      return [fontId, ...withoutCurrent].slice(0, MAX_RECENT_FONTS)
    })
  }

  // ============================================================
  // FONT CHANGE
  // ============================================================

  const handleFontChange = (font: FontDef) => {
    if (!canvas) return

    if (!activeObject || activeObject.type !== "i-text") {
      return
    }

    const textObj = activeObject as IText

    // Fabric typings can differ between versions.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    textObj.set("fontFamily", font.fabricFamily)

    canvas.requestRenderAll()

    /*
     * Track the application-level font ID.
     */
    addToRecentFonts(font.id)

    /*
     * Force the picker to immediately reflect
     * the new selection.
     */
    forceUpdate()
  }

  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  const clearSearch = () => {
    setSearchQuery("")
  }

  // ============================================================
  // RESET RECENTS
  // ============================================================

  const clearRecentFonts = () => {
    setRecentFontIds([])
  }

  // ============================================================
  // NOTHING SELECTED
  // ============================================================

  if (!activeObject || activeObject.type !== "i-text") {
    return null
  }

  const textObj = activeObject as IText

  const selectedFontFamily = textObj.get("fontFamily")

  return (
    <div className="flex h-full min-h-0 flex-col pt-2">
      {/* ======================================================
          SEARCH
      ======================================================= */}

      <div className="relative mb-3 shrink-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search size={14} className="text-white/40" />
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
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

      {/* ======================================================
          CURRENT FONT
      ======================================================= */}

      {currentFont && (
        <div className="mb-3 shrink-0 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.10] via-white/[0.04] to-transparent p-3.5 shadow-[0_0_25px_rgba(59,130,246,0.05)]">
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

          <div
            className="truncate text-[25px] leading-none text-white"
            style={{
              fontFamily: currentFont.cssVariable,
            }}
          >
            {currentFont.name}
          </div>

          <div
            className="mt-2 truncate text-[13px] leading-tight text-white/45"
            style={{
              fontFamily: currentFont.cssVariable,
            }}
          >
            The Art of the Frame
          </div>

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

      {/* ======================================================
          RECENT FONTS
      ======================================================= */}

      {recentFonts.length > 0 && (
        <div className="mb-3 shrink-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Clock3 size={11} className="text-white/30" />

              <span className="text-[9px] font-semibold tracking-[0.15em] text-white/30 uppercase">
                Recently Used
              </span>
            </div>

            <button
              type="button"
              onClick={clearRecentFonts}
              className="text-[9px] text-white/25 transition-colors hover:text-white/60"
            >
              Clear
            </button>
          </div>

          <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1">
            {recentFonts.map((font) => {
              const isActive = selectedFontFamily === font.fabricFamily

              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => handleFontChange(font)}
                  title={font.name}
                  className={`group relative flex max-w-[140px] min-w-[110px] flex-1 flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.97] ${
                    isActive
                      ? "border-blue-500/40 bg-blue-500/10"
                      : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.06]"
                  } `}
                >
                  <span
                    className="w-full truncate text-[15px] leading-tight text-white/80"
                    style={{
                      fontFamily: font.cssVariable,
                    }}
                  >
                    {font.name}
                  </span>

                  <span className="mt-1 w-full truncate text-[8px] tracking-wider text-white/25 uppercase">
                    {font.category}
                  </span>

                  {isActive && (
                    <span className="absolute top-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Check size={8} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ======================================================
          CATEGORY FILTERS
      ======================================================= */}

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

      {/* ======================================================
          RESULT COUNT
      ======================================================= */}

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

      {/* ======================================================
          SCROLLABLE FONT LIST
      ======================================================= */}

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
            const isActive = selectedFontFamily === font.fabricFamily

            return (
              <button
                key={font.id}
                type="button"
                onClick={() => handleFontChange(font)}
                className={`group relative flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                  isActive
                    ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.08)]"
                    : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.06]"
                } `}
              >
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
