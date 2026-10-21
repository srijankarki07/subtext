/**
 * The local design library.
 *
 * One record per saved design, in IndexedDB rather than `localStorage`: a
 * thumbnail is a few tens of kilobytes and a payload is a few more, and the
 * `localStorage` quota is already shared with the autosaved session. This is
 * the same mechanism the photo and font stores use.
 *
 * Only metadata leaves this module for the UI; the payload comes along when a
 * design is opened.
 */

import type { ProjectPayload } from "@/lib/persistence"

const DATABASE_NAME = "Subtext_designs"
const DATABASE_VERSION = 1
const STORE_NAME = "designs"

export interface DesignSummary {
  id: string
  name: string
  /** A small JPEG data URL, or null for a design migrated without one. */
  thumbnail: string | null
  createdAt: number
  updatedAt: number
  artboard: { width: number; height: number }
}

export interface DesignRecord extends DesignSummary {
  payload: ProjectPayload
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

export function createDesignId(): string {
  return `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const CURRENT_DESIGN_KEY = "Subtext_current_design"

/**
 * Which design the session belongs to.
 *
 * Kept in `localStorage` so a reload can keep autosaving into the same design
 * instead of forgetting it had ever been saved.
 */
export function readCurrentDesignId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(CURRENT_DESIGN_KEY)
}

export function writeCurrentDesignId(id: string | null): void {
  if (typeof window === "undefined") return
  if (id) localStorage.setItem(CURRENT_DESIGN_KEY, id)
  else localStorage.removeItem(CURRENT_DESIGN_KEY)
}

/** Every design, newest first. Payloads stay in the database. */
export async function listDesigns(): Promise<DesignSummary[]> {
  return (await listDesignRecords())
    .map(({ payload: _payload, ...summary }) => summary)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Full records, for the one caller that needs to inspect asset references. */
export async function listDesignRecords(): Promise<DesignRecord[]> {
  return runRequest<DesignRecord[]>("readonly", (store) => store.getAll())
}

export async function getDesign(id: string): Promise<DesignRecord | null> {
  const record = await runRequest<DesignRecord | undefined>(
    "readonly",
    (store) => store.get(id)
  )
  return record ?? null
}

export async function putDesign(record: DesignRecord): Promise<void> {
  await runRequest("readwrite", (store) => store.put(record))
}

export async function deleteDesignRecord(id: string): Promise<void> {
  await runRequest("readwrite", (store) => store.delete(id))
}
