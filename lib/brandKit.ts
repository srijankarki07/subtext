/**
 * The brand kit: colours, fonts and logos, kept on this device.
 *
 * This is the accounts-free version of what Canva sells as a Brand Kit. There
 * is no account and no sync, so the kit is a single record in IndexedDB - the
 * same mechanism the design library and the photo store already use. Logos are
 * stored as assets, by id, so the kit record stays a few hundred bytes.
 */

const DATABASE_NAME = "Subtext_brand"
const DATABASE_VERSION = 1
const STORE_NAME = "kit"
const RECORD_KEY = "kit"

export type BrandFontRole = "heading" | "body"

export interface BrandColour {
  id: string
  /** Six-digit hex, lower-case, with the leading `#`. */
  hex: string
}

export interface BrandLogo {
  id: string
  /** The id of the PNG/SVG bytes in `Subtext_assets`. */
  assetId: string
  name: string
}

export interface BrandFonts {
  heading: string | null
  body: string | null
}

export interface BrandKit {
  colours: BrandColour[]
  logos: BrandLogo[]
  fonts: BrandFonts
  updatedAt: number
}

export const EMPTY_BRAND_KIT: BrandKit = {
  colours: [],
  logos: [],
  fonts: { heading: null, body: null },
  updatedAt: 0,
}

/** Enough to be a palette; more than this stops being a decision. */
export const MAX_BRAND_COLOURS = 18

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function createBrandId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * A colour as stored, or null when it is not a colour.
 *
 * The colour input and the selection's fill both arrive as strings that are
 * usually, but not always, `#rrggbb` - Fabric hands back `rgba(...)` for some
 * presets, and a swatch that silently stored that would render as nothing.
 */
export function normalizeHex(value: string): string | null {
  const trimmed = value.trim()
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed)
  if (!match) return null

  const digits = match[1].toLowerCase()
  const expanded =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits
  return `#${expanded}`
}

/** Whether a colour is already in the palette, case-insensitively. */
export function hasColour(colours: BrandColour[], hex: string): boolean {
  const normalized = normalizeHex(hex)
  return (
    normalized !== null && colours.some((colour) => colour.hex === normalized)
  )
}

/** Appends a colour unless it is a duplicate or the palette is full. */
export function addColour(kit: BrandKit, value: string): BrandKit {
  const hex = normalizeHex(value)
  if (!hex) return kit
  if (kit.colours.length >= MAX_BRAND_COLOURS) return kit
  if (hasColour(kit.colours, hex)) return kit

  return {
    ...kit,
    colours: [...kit.colours, { id: createBrandId("colour"), hex }],
    updatedAt: Date.now(),
  }
}

export function removeColour(kit: BrandKit, id: string): BrandKit {
  return {
    ...kit,
    colours: kit.colours.filter((colour) => colour.id !== id),
    updatedAt: Date.now(),
  }
}

export function setFont(
  kit: BrandKit,
  role: BrandFontRole,
  family: string | null
): BrandKit {
  return {
    ...kit,
    fonts: { ...kit.fonts, [role]: family },
    updatedAt: Date.now(),
  }
}

export function addLogo(kit: BrandKit, logo: BrandLogo): BrandKit {
  return {
    ...kit,
    logos: [...kit.logos, logo],
    updatedAt: Date.now(),
  }
}

export function removeLogo(kit: BrandKit, id: string): BrandKit {
  return {
    ...kit,
    logos: kit.logos.filter((logo) => logo.id !== id),
    // The bytes stay in the asset store: a saved design may still reference
    // them, and deleting them would leave that design with a broken layer.
    updatedAt: Date.now(),
  }
}

/** Reads the kit, falling back to an empty one on a first run or a bad record. */
export async function readBrandKit(): Promise<BrandKit> {
  if (typeof indexedDB === "undefined") return EMPTY_BRAND_KIT

  try {
    const database = await openDatabase()
    const record = await new Promise<BrandKit | undefined>(
      (resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly")
        const request = transaction.objectStore(STORE_NAME).get(RECORD_KEY)
        request.onsuccess = () =>
          resolve(request.result as BrandKit | undefined)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => database.close()
      }
    )

    if (!record || !Array.isArray(record.colours)) return EMPTY_BRAND_KIT
    return {
      colours: record.colours,
      logos: Array.isArray(record.logos) ? record.logos : [],
      fonts: {
        heading: record.fonts?.heading ?? null,
        body: record.fonts?.body ?? null,
      },
      updatedAt: record.updatedAt ?? 0,
    }
  } catch (error) {
    console.error("Could not read the brand kit:", error)
    return EMPTY_BRAND_KIT
  }
}

export async function writeBrandKit(kit: BrandKit): Promise<void> {
  if (typeof indexedDB === "undefined") return

  try {
    const database = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite")
      transaction.objectStore(STORE_NAME).put({ ...kit, id: RECORD_KEY })
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error("Could not save the brand kit:", error)
  }
}
