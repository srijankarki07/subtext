"use client"

import { useMemo, useReducer, useRef, useState } from "react"
import {
  Check,
  Crown,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
import { FONTS, type FontCategory, type FontDef } from "@/lib/fonts"
import { useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * Typeface browser.
 *
 * Two structural fixes:
 *
 * 1. The panel used to be `h-full` inside an auto-height wrapper, so
 *    `height: 100%` resolved to `auto` and its inner `flex-1 overflow-y-auto`
 *    list never became a scroll container. Search, upload, the current-font
 *    card and the category filters therefore scrolled away with the list.
 *    There is now exactly one scroll region - the parent's - and the controls
 *    stick to its top.
 *
 * 2. Each row was a `<button>` containing another element with
 *    `role="button"` for the delete action, and its mouse path opened the
 *    styled confirm dialog while its keyboard path called native
 *    `window.confirm()`. The row's select action and the delete action are now
 *    sibling buttons, so both input paths behave identically.
 */

type FontFilter = "All" | "Recommended" | "Premium" | "Uploaded" | FontCategory

type FontOption = Omit<FontDef, "category"> & {
  category: FontCategory | "Uploaded"
  customFontId?: string
  format?: string
}

const CATEGORIES: FontFilter[] = [
  "All",
  "Recommended",
  "Premium",
  "Uploaded",
  "Serif",
  "Sans-serif",
  "Display",
  "Script",
  "Monospace",
]

export default function FontPicker() {
  const canvas = useEditorStore((s) => s.canvas)
  const activeObject = useEditorStore((s) => s.activeObject)
  const applyTextStyle = useEditorStore((s) => s.applyTextStyle)
  const getActiveSelectionStyle = useEditorStore(
    (s) => s.getActiveSelectionStyle
  )
  const customFonts = useEditorStore((s) => s.customFonts)
  const customFontsLoading = useEditorStore((s) => s.customFontsLoading)
  const customFontError = useEditorStore((s) => s.customFontError)
  const uploadCustomFont = useEditorStore((s) => s.uploadCustomFont)
  const removeCustomFont = useEditorStore((s) => s.removeCustomFont)
  const setConfirmDialog = useEditorStore((s) => s.setConfirmDialog)

  const [activeCategory, setActiveCategory] = useState<FontFilter>("All")
  const [searchQuery, setSearchQuery] = useState("")

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const currentFontFamily =
    activeObject?.type === "i-text"
      ? getActiveSelectionStyle("fontFamily")
      : undefined

  const customFontOptions = useMemo<FontOption[]>(
    () =>
      customFonts.map((font) => ({
        id: `custom-${font.id}`,
        name: font.name,
        category: "Uploaded",
        cssVariable: font.family,
        fabricFamily: font.family,
        description: `${font.format.toUpperCase()} font`,
        customFontId: font.id,
        format: font.format,
      })),
    [customFonts]
  )

  const allFonts = useMemo<FontOption[]>(
    () => [...FONTS, ...customFontOptions],
    [customFontOptions]
  )

  const currentFont = useMemo<FontOption | undefined>(() => {
    if (!currentFontFamily) return undefined
    return allFonts.find((font) => font.fabricFamily === currentFontFamily)
  }, [allFonts, currentFontFamily])

  const filteredFonts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return allFonts
      .filter((font) => {
        let matchesCategory = true

        if (
          activeCategory !== "All" &&
          activeCategory !== "Recommended" &&
          activeCategory !== "Premium"
        ) {
          matchesCategory = font.category === activeCategory
        }
        if (activeCategory === "Premium")
          matchesCategory = font.premium === true
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
        if (activeCategory === "Uploaded") {
          matchesCategory = font.customFontId !== undefined
        }

        const matchesSearch =
          !query ||
          font.name.toLowerCase().includes(query) ||
          font.category.toLowerCase().includes(query) ||
          font.description?.toLowerCase().includes(query) ||
          font.useCases?.some((useCase) =>
            useCase.toLowerCase().includes(query)
          )

        return matchesCategory && matchesSearch
      })
      .sort((a, b) => {
        if (activeCategory === "All") {
          if (a.premium && !b.premium) return -1
          if (!a.premium && b.premium) return 1
        }
        return a.name.localeCompare(b.name)
      })
  }, [activeCategory, allFonts, searchQuery])

  if (!activeObject || activeObject.type !== "i-text") {
    return null
  }

  const handleFontChange = (fabricFamily: string) => {
    if (!activeObject || !canvas) return
    applyTextStyle("fontFamily", fabricFamily)
    forceUpdate()
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    if (await uploadCustomFont(file)) setActiveCategory("Uploaded")
  }

  const categoryChip = (active: boolean) =>
    cn(
      "flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors outline-none",
      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
      active
        ? "bg-foreground text-background"
        : "bg-subtle text-[var(--text-secondary)] hover:bg-subtle-hover hover:text-foreground"
    )

  return (
    <div className="flex flex-col gap-3">
      {/* One sticky header, so filters never scroll out of reach. */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-card pb-2">
        <div className="relative">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            aria-label="Search fonts"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search fonts"
            className="w-full rounded-lg border border-border bg-card py-2 pr-9 pl-9 text-[13px] text-foreground transition-colors outline-none placeholder:text-[var(--text-muted)] focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-[var(--text-muted)] transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
          className="hidden"
          onChange={(event) => {
            void handleUpload(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={customFontsLoading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-edge-strong py-2 text-[12px] font-medium text-[var(--text-secondary)] transition-colors outline-none hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
        >
          {customFontsLoading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload size={14} aria-hidden="true" />
          )}
          {customFontsLoading ? "Loading font…" : "Upload a font"}
        </button>
        {customFontError && (
          <p
            role="alert"
            className="text-[11px] leading-relaxed text-destructive"
          >
            {customFontError}
          </p>
        )}

        {currentFont && (
          <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-3">
            <div className="flex items-center justify-between gap-2 pb-2">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                <Sparkles size={11} aria-hidden="true" />
                Current font
              </span>
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Check size={9} aria-hidden="true" />
                Selected
              </span>
            </div>
            <p
              className="truncate text-[24px] leading-tight text-foreground"
              style={{ fontFamily: currentFont.cssVariable }}
            >
              {currentFont.name}
            </p>
            <p
              className="mt-1 truncate text-[13px] leading-tight text-[var(--text-muted)]"
              style={{ fontFamily: currentFont.cssVariable }}
            >
              The art of the frame
            </p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              <span>{currentFont.category}</span>
              {currentFont.premium && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Crown size={9} aria-hidden="true" />
                    Premium
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
              className={categoryChip(activeCategory === category)}
            >
              {category === "Recommended" && (
                <Sparkles size={11} aria-hidden="true" />
              )}
              {category === "Premium" && <Crown size={11} aria-hidden="true" />}
              {category}
            </button>
          ))}
        </div>

        <p className="px-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
          {filteredFonts.length} {filteredFonts.length === 1 ? "font" : "fonts"}
          {activeCategory === "Recommended" && " · curated"}
        </p>
      </div>

      {/* Flows in the parent's scroll region - no nested scroller. */}
      {filteredFonts.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[13px] text-[var(--text-muted)]">No fonts found</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("")
              setActiveCategory("All")
            }}
            className="mt-2 cursor-pointer text-[12px] text-primary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filteredFonts.map((font) => {
            const isActive = currentFontFamily === font.fabricFamily

            return (
              <div
                key={font.id}
                className={cn(
                  "flex items-center gap-1 rounded-lg border p-1.5 transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-border hover:bg-subtle-hover"
                )}
              >
                <button
                  type="button"
                  onClick={() => handleFontChange(font.fabricFamily)}
                  aria-pressed={isActive}
                  className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span
                        className="block truncate text-[18px] leading-tight text-foreground"
                        style={{ fontFamily: font.cssVariable }}
                      >
                        {font.name}
                      </span>
                      {font.premium && (
                        <Crown
                          size={10}
                          aria-label="Premium"
                          className="shrink-0 text-[var(--color-saffron)]"
                        />
                      )}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                      <span>{font.category}</span>
                      {font.description && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="max-w-[150px] truncate">
                            {font.description}
                          </span>
                        </>
                      )}
                    </span>
                  </span>

                  {isActive && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={11} aria-hidden="true" />
                    </span>
                  )}
                </button>

                {font.customFontId && (
                  <IconButton
                    icon={<Trash2 size={13} />}
                    label={`Remove ${font.name}`}
                    size="sm"
                    tone="danger"
                    onClick={() =>
                      setConfirmDialog({
                        title: "Remove font",
                        message: `Remove ${font.name} from your uploaded fonts?`,
                        confirmText: "Remove",
                        onConfirm: () =>
                          void removeCustomFont(font.customFontId!),
                      })
                    }
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
