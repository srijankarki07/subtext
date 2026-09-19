export const CUSTOM_FONT_FORMATS = ["ttf", "otf", "woff", "woff2"] as const
export const CUSTOM_FONT_MAX_BYTES = 10 * 1024 * 1024

const DATABASE_NAME = "cinemate_fonts"
const DATABASE_VERSION = 1
const STORE_NAME = "fonts"

export type CustomFontFormat = (typeof CUSTOM_FONT_FORMATS)[number]

export interface StoredCustomFont {
  id: string
  name: string
  family: string
  format: CustomFontFormat
  size: number
  data: ArrayBuffer
  createdAt: number
}

export interface CustomFontMetadata extends Omit<StoredCustomFont, "data"> {}

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || ""
}

export function validateCustomFontFile(file: File): string | null {
  const extension = getExtension(file.name)

  if (!CUSTOM_FONT_FORMATS.includes(extension as CustomFontFormat)) {
    return "Use a .ttf, .otf, .woff, or .woff2 font file."
  }

  if (file.size > CUSTOM_FONT_MAX_BYTES) {
    return "Font files must be 10 MB or smaller."
  }

  return null
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is unavailable in this browser."))
      return
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onerror = () =>
      reject(request.error || new Error("Unable to open font storage."))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode)
        const request = action(transaction.objectStore(STORE_NAME))
        request.onerror = () =>
          reject(request.error || new Error("Font storage request failed."))
        request.onsuccess = () => resolve(request.result as T)
        transaction.oncomplete = () => database.close()
        transaction.onerror = () =>
          reject(
            transaction.error || new Error("Font storage transaction failed.")
          )
      })
  )
}

export function listStoredCustomFonts(): Promise<StoredCustomFont[]> {
  return withStore<StoredCustomFont[]>("readonly", (store) => store.getAll())
}

export function saveStoredCustomFont(font: StoredCustomFont): Promise<void> {
  return withStore<IDBValidKey>("readwrite", (store) => store.put(font)).then(
    () => undefined
  )
}

export function deleteStoredCustomFont(id: string): Promise<void> {
  return withStore<undefined>("readwrite", (store) => store.delete(id)).then(
    () => undefined
  )
}

export function getCustomFontMetadata(
  font: StoredCustomFont
): CustomFontMetadata {
  const { data: _data, ...metadata } = font
  return metadata
}

export function getCustomFontFamily(id: string): string {
  return `CinemateCustom_${id.replace(/[^a-zA-Z0-9_-]/g, "")}`
}

export async function registerCustomFont(
  font: StoredCustomFont
): Promise<void> {
  const fontFace = new FontFace(font.family, font.data)
  await fontFace.load()
  document.fonts.add(fontFace)
}
