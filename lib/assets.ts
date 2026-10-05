/**
 * Photo storage, outside the document.
 *
 * Fabric serialises an image object's pixels into its JSON as a base64 data
 * URL. That put a copy of the photo into *every* history snapshot — thirty of
 * them — and into the `localStorage` payload, which is why saving a realistic
 * photo failed outright on the storage quota: a 5 MB JPEG is about 6.7 MB as
 * base64, and a typical origin quota is 5–10 MB in total.
 *
 * So the bytes live here instead, in IndexedDB, once per photo, and the
 * document keeps only an id. `localStorage` then holds a few kilobytes of
 * canvas JSON, and history snapshots hold no pixels at all.
 *
 * IndexedDB is already the mechanism this project uses for user fonts
 * (`lib/customFonts.ts`), so there is no new dependency or pattern.
 */

const DATABASE_NAME = "Subtext_assets"
const DATABASE_VERSION = 1
const STORE_NAME = "assets"

export interface StoredAsset {
  id: string
  blob: Blob
  createdAt: number
}

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

function runRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode)
        const request = operation(transaction.objectStore(STORE_NAME))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => database.close()
      })
  )
}

/** Ids are stable per photo, so re-saving never stores the same bytes twice. */
export function createAssetId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function putAsset(id: string, blob: Blob): Promise<void> {
  await runRequest("readwrite", (store) =>
    store.put({ id, blob, createdAt: Date.now() } satisfies StoredAsset)
  )
}

export async function getAssetBlob(id: string): Promise<Blob | null> {
  const record = await runRequest<StoredAsset | undefined>("readonly", (store) =>
    store.get(id)
  )
  return record?.blob ?? null
}

export async function listAssetIds(): Promise<string[]> {
  const keys = await runRequest<IDBValidKey[]>("readonly", (store) =>
    store.getAllKeys()
  )
  return keys.map(String)
}

export async function deleteAsset(id: string): Promise<void> {
  await runRequest("readwrite", (store) => store.delete(id))
}

/**
 * Object URLs handed out so far.
 *
 * Fabric keeps the element it was given, so these cannot be revoked while the
 * document is alive. Revoking the previous batch when the next one is minted
 * bounds the leak to one document's worth.
 */
let issuedUrls: string[] = []

function createObjectUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob)
  issuedUrls.push(url)
  return url
}

export function releaseIssuedAssetUrls(): void {
  issuedUrls.forEach((url) => URL.revokeObjectURL(url))
  issuedUrls = []
}
