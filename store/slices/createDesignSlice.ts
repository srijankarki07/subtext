import type { Canvas } from "fabric"
import { StateCreator } from "zustand"

import { deleteAsset } from "@/lib/assets"
import {
  createDesignId,
  deleteDesignRecord,
  getDesign,
  listDesignRecords,
  listDesigns,
  putDesign,
  readCurrentDesignId,
  writeCurrentDesignId,
  type DesignRecord,
} from "@/lib/designs"
import { withoutEditorChrome } from "@/lib/fabricDocument"
import { applyGrain } from "@/lib/grain"
import {
  DOCUMENT_KEY,
  STORAGE_KEY,
  signatureOf,
  type ProjectPayload,
} from "@/lib/persistence"
import { DesignSlice, EditorStore } from "@/types/store.types"

/**
 * The design library.
 *
 * The autosaved document slot stays what it always was - the session a reload
 * comes back to. This adds the explicit library that replaces the old
 * saved-copy slot: named designs, each with a thumbnail, stored in IndexedDB.
 * A design is updated by autosave once the canvas belongs to it, so "saved" and
 * "current" do not drift apart.
 */

const THUMBNAIL_WIDTH = 320

/** A small JPEG of the artboard, without editor-only chrome. */
function renderThumbnail(
  canvas: Canvas,
  grainIntensity: number
): string | null {
  try {
    const scale = THUMBNAIL_WIDTH / canvas.getWidth()
    const element = withoutEditorChrome(canvas, () => {
      const rendered = canvas.toCanvasElement(scale)
      applyGrain(rendered, grainIntensity, { scale })
      return rendered
    })
    return element.toDataURL("image/jpeg", 0.72)
  } catch (error) {
    console.error("Could not render the design thumbnail:", error)
    return null
  }
}

function assetIdsOf(payload: ProjectPayload): string[] {
  const document = payload.canvasJson as {
    objects?: Array<Record<string, unknown>>
  }
  return (document?.objects ?? [])
    .map((object) => object.assetId)
    .filter((id): id is string => typeof id === "string")
}

export const createDesignSlice: StateCreator<
  EditorStore,
  [],
  [],
  DesignSlice
> = (_set, get) => ({
  designs: [],
  currentDesignId: null,
  isDesignsOpen: false,

  initializeDesigns: async () => {
    const storedId = readCurrentDesignId()
    if (storedId) _set({ currentDesignId: storedId })

    // Migrate the old explicit saved copy into the library, once. The saved
    // session is already restored by the boot path; this is the copy the old
    // Restore button meant.
    try {
      if ((await listDesigns()).length === 0) {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const payload = JSON.parse(raw) as ProjectPayload
          await putDesign({
            id: createDesignId(),
            name: payload.documentTitle?.trim() || "Saved design",
            thumbnail: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            artboard: payload.artboard,
            payload,
          })
          localStorage.removeItem(STORAGE_KEY)
          // If this was the only copy, keep the boot restore working too.
          if (!localStorage.getItem(DOCUMENT_KEY)) {
            localStorage.setItem(DOCUMENT_KEY, JSON.stringify(payload))
          }
        }
      }
    } catch (error) {
      console.error("Could not migrate the saved project:", error)
    }

    await get().refreshDesigns()

    // The stored id may point at a design deleted in another tab.
    const currentId = get().currentDesignId
    if (currentId && !get().designs.some((design) => design.id === currentId)) {
      _set({ currentDesignId: null })
      writeCurrentDesignId(null)
    }
  },

  refreshDesigns: async () => {
    try {
      _set({ designs: await listDesigns() })
    } catch (error) {
      console.error("Could not read the design library:", error)
    }
  },

  openDesigns: async () => {
    await get().refreshDesigns()
    _set({ isDesignsOpen: true })
  },

  closeDesigns: () => _set({ isDesignsOpen: false }),

  saveDesign: async () => {
    const { canvas, documentTitle, grainIntensity, artboard, currentDesignId } =
      get()
    if (!canvas) return false

    const payload = get().captureDocument()
    if (!payload) {
      _set({
        alertDialog: {
          title: "Could not save",
          message:
            "This project is too large for browser storage. Try a smaller image, then save again.",
        },
      })
      return false
    }

    try {
      const existing = currentDesignId ? await getDesign(currentDesignId) : null

      const record: DesignRecord = {
        id: existing?.id ?? createDesignId(),
        name: documentTitle.trim() || existing?.name || "Untitled design",
        thumbnail: renderThumbnail(canvas, grainIntensity),
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        artboard,
        payload,
      }
      await putDesign(record)

      // The session slot and the design hold the same payload, so a reload
      // comes back to exactly what was saved.
      localStorage.setItem(DOCUMENT_KEY, JSON.stringify(payload))
      writeCurrentDesignId(record.id)
      _set({
        currentDesignId: record.id,
        documentTitle: record.name,
        lastSavedAt: payload.savedAt,
        isDirty: false,
        savedSignature: signatureOf(payload),
      })
      await get().refreshDesigns()
      return true
    } catch (error) {
      console.error("Could not save the design:", error)
      _set({
        alertDialog: {
          title: "Could not save",
          message:
            "The browser refused to store this design. Try a smaller image, then save again.",
        },
      })
      return false
    }
  },

  openDesign: async (id) => {
    try {
      const record = await getDesign(id)
      if (!record) return false

      // Detach first: the load's autosave must not write the incoming payload
      // into whichever design was open before.
      _set({ currentDesignId: null })
      writeCurrentDesignId(null)

      const loaded = await get().loadProjectPayload(record.payload, {
        announce: false,
      })
      if (!loaded) return false

      writeCurrentDesignId(record.id)
      _set({
        currentDesignId: record.id,
        documentTitle: record.name,
        lastSavedAt: record.payload.savedAt,
        isDesignsOpen: false,
      })
      return true
    } catch (error) {
      console.error("Could not open the design:", error)
      return false
    }
  },

  newDesign: () => {
    // Detach before clearing, or the empty canvas would be autosaved into the
    // design that was open.
    writeCurrentDesignId(null)
    _set({ currentDesignId: null })
    get().clearCanvas()
    _set({ isDesignsOpen: false })
    void get().refreshDesigns()
  },

  renameDesign: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return

    try {
      const record = await getDesign(id)
      if (!record) return
      await putDesign({ ...record, name: trimmed, updatedAt: Date.now() })
      if (get().currentDesignId === id) _set({ documentTitle: trimmed })
      await get().refreshDesigns()
    } catch (error) {
      console.error("Could not rename the design:", error)
    }
  },

  removeDesign: async (id) => {
    try {
      const records = await listDesignRecords()
      const target = records.find((record) => record.id === id)

      if (target) {
        // Delete the photos only if no other design still points at them -
        // two designs can share one photo asset.
        const stillReferenced = new Set(
          records
            .filter((record) => record.id !== id)
            .flatMap((record) => assetIdsOf(record.payload))
        )
        assetIdsOf(target.payload)
          .filter((assetId) => !stillReferenced.has(assetId))
          .forEach((assetId) => void deleteAsset(assetId))

        await deleteDesignRecord(id)
      }

      if (get().currentDesignId === id) {
        _set({ currentDesignId: null })
        writeCurrentDesignId(null)
      }
      await get().refreshDesigns()
    } catch (error) {
      console.error("Could not delete the design:", error)
    }
  },
})
