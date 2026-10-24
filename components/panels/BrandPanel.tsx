"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Section } from "@/components/ui/section"
import { getAssetBlob } from "@/lib/assets"
import { MAX_BRAND_COLOURS, normalizeHex } from "@/lib/brandKit"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * The Brand tool's panel.
 *
 * A kit is only useful if applying it is faster than doing it by hand: every
 * colour paints, every font applies, and a logo is one click from the artboard.
 * Saving is the same gesture in reverse - the selection's own colour and font
 * are what go in, rather than a separate picker that asks the user to type in
 * what they have already made.
 */

/** A stored logo's bytes, as a URL that stops being valid with the component. */
function useAssetUrl(assetId: string) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null

    void getAssetBlob(assetId).then((blob) => {
      if (!alive || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })

    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId])

  return url
}

function LogoCard({
  name,
  assetId,
  onPlace,
  onRemove,
}: {
  name: string
  assetId: string
  onPlace: () => void
  onRemove: () => void
}) {
  const url = useAssetUrl(assetId)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onPlace}
        aria-label={`Place the ${name} logo`}
        title={`Place ${name}`}
        className="flex h-16 w-full cursor-pointer items-center justify-center rounded-lg border border-border bg-subtle p-2 transition-colors outline-none hover:bg-subtle-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        {url ? (
          // The stored bytes are already the final size; next/image would only
          // add a second copy of the logo to the page.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-[var(--text-muted)]">Loading…</span>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove the ${name} logo`}
        className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-[var(--text-muted)] shadow-sm transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X size={10} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function BrandPanel() {
  const brandKit = useEditorStore((s) => s.brandKit)
  const loadBrandKit = useEditorStore((s) => s.loadBrandKit)
  const addBrandColour = useEditorStore((s) => s.addBrandColour)
  const addBrandColourFromSelection = useEditorStore(
    (s) => s.addBrandColourFromSelection
  )
  const removeBrandColour = useEditorStore((s) => s.removeBrandColour)
  const applyBrandColour = useEditorStore((s) => s.applyBrandColour)
  const addBrandLogo = useEditorStore((s) => s.addBrandLogo)
  const removeBrandLogo = useEditorStore((s) => s.removeBrandLogo)
  const placeBrandLogo = useEditorStore((s) => s.placeBrandLogo)
  const saveBrandFontFromSelection = useEditorStore(
    (s) => s.saveBrandFontFromSelection
  )
  const applyBrandFont = useEditorStore((s) => s.applyBrandFont)
  const activeObject = useEditorStore((s) => s.activeObject)

  const logoInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadBrandKit()
  }, [loadBrandKit])

  const isText = activeObject?.type === "i-text"
  const selectionFill = (activeObject as { fill?: unknown } | null)?.fill
  const selectedHex =
    typeof selectionFill === "string" ? normalizeHex(selectionFill) : null

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Logo"
        description="Placed as a normal layer, a third of the frame across."
      >
        <Button
          variant="outline"
          className="w-full"
          onClick={() => logoInput.current?.click()}
        >
          <ImagePlus size={14} aria-hidden="true" />
          Add a logo
        </Button>
        <input
          ref={logoInput}
          type="file"
          accept="image/*"
          aria-label="Add a logo file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void addBrandLogo(file)
            event.target.value = ""
          }}
        />

        {brandKit.logos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {brandKit.logos.map((logo) => (
              <LogoCard
                key={logo.id}
                name={logo.name}
                assetId={logo.assetId}
                onPlace={() => void placeBrandLogo(logo.id)}
                onRemove={() => removeBrandLogo(logo.id)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Colours"
        description="Click a colour to paint the selected text or shape."
      >
        <div className="grid grid-cols-6 gap-1.5">
          {brandKit.colours.map((colour) => (
            <div key={colour.id} className="relative">
              <button
                type="button"
                onClick={() => applyBrandColour(colour.hex)}
                aria-label={`Apply the brand colour ${colour.hex}`}
                title={colour.hex}
                style={{ background: colour.hex }}
                className="h-7 w-full cursor-pointer rounded-md border border-border/60 transition-transform outline-none hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <button
                type="button"
                onClick={() => removeBrandColour(colour.id)}
                aria-label={`Remove the brand colour ${colour.hex}`}
                className="absolute -top-1 -right-1 flex size-3.5 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-[var(--text-muted)] transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X size={7} aria-hidden="true" />
              </button>
            </div>
          ))}

          {brandKit.colours.length < MAX_BRAND_COLOURS && (
            <label
              title="Add a colour"
              className="relative flex h-7 w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-[var(--text-muted)] transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:bg-subtle-hover hover:text-foreground"
            >
              <Plus size={12} aria-hidden="true" />
              <input
                type="color"
                aria-label="Add a brand colour"
                defaultValue="#111111"
                onChange={(event) => addBrandColour(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={!selectedHex}
          onClick={() => addBrandColourFromSelection()}
          className={cn("w-full", !selectedHex && "opacity-60")}
        >
          Add the selection's colour
        </Button>
      </Section>

      <Section
        title="Fonts"
        description="Save the selected text's face, then apply it again from here."
      >
        {(["heading", "body"] as const).map((role) => {
          const family = brandKit.fonts[role]
          return (
            <div
              key={role}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-2"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-[0.08em] text-[var(--text-muted)] uppercase">
                  {role}
                </p>
                <p
                  className="truncate text-[12px] text-foreground"
                  style={family ? { fontFamily: family } : undefined}
                >
                  {family ?? "Not set"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Apply the brand ${role} font`}
                  disabled={!family || !isText}
                  onClick={() => applyBrandFont(role)}
                >
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Save the selection as the brand ${role} font`}
                  disabled={!isText}
                  onClick={() => saveBrandFontFromSelection(role)}
                >
                  {family ? "Replace" : "Save"}
                </Button>
              </div>
            </div>
          )
        })}
      </Section>

      <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
        The kit is stored in this browser. Nothing is uploaded anywhere.
      </p>
    </div>
  )
}
