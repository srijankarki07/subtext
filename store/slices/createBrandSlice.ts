import { FabricImage } from "fabric"

import { createAssetId, getAssetBlob, putAsset } from "@/lib/assets"
import {
  EMPTY_BRAND_KIT,
  addColour,
  addLogo,
  createBrandId,
  normalizeHex,
  readBrandKit,
  removeColour,
  removeLogo,
  setFont,
  writeBrandKit,
  type BrandKit,
} from "@/lib/brandKit"
import { BrandSlice, EditorStore } from "@/types/store.types"
import { StateCreator } from "zustand"

/**
 * The brand kit's state and its two verbs: save something into the kit, or
 * apply something from it to the selection.
 *
 * Writing to IndexedDB is deliberately fire-and-forget. The kit is small and
 * the UI is a click away from the next action; making every swatch wait on a
 * transaction would put storage latency between the user and the artwork.
 */
/**
 * The logo's bytes as a data URL.
 *
 * A blob URL would be cheaper, but Fabric's image loader marks a non-data URL
 * as cross-origin, and that combination fails for `blob:` sources - the placed
 * logo never loaded. A logo is small, and `dehydrateCanvas` drops the source as
 * soon as the object has an asset id, so the document still stores only the id.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("Unreadable blob"))
    reader.readAsDataURL(blob)
  })
}

export const createBrandSlice: StateCreator<EditorStore, [], [], BrandSlice> = (
  set,
  get
) => {
  const commit = (next: BrandKit) => {
    set({ brandKit: next })
    void writeBrandKit(next)
  }

  return {
    brandKit: EMPTY_BRAND_KIT,
    isBrandLoaded: false,

    loadBrandKit: async () => {
      if (get().isBrandLoaded) return
      const kit = await readBrandKit()
      set({ brandKit: kit, isBrandLoaded: true })
    },

    addBrandColour: (value) => {
      const next = addColour(get().brandKit, value)
      if (next !== get().brandKit) commit(next)
    },

    addBrandColourFromSelection: () => {
      const { activeObject } = get()
      const fill = (activeObject as { fill?: unknown } | null)?.fill
      if (typeof fill !== "string") return false
      const hex = normalizeHex(fill)
      if (!hex) return false
      get().addBrandColour(hex)
      return true
    },

    removeBrandColour: (id) => {
      commit(removeColour(get().brandKit, id))
    },

    /**
     * Paints the selection with a brand colour.
     *
     * Three shapes of object, one meaning: text takes a fill, an inserted
     * element paints its own nodes (stroke-only elements take a stroke), and
     * anything else with a `fill` is set directly.
     */
    applyBrandColour: (value) => {
      const hex = normalizeHex(value)
      const { canvas, activeObject, saveHistoryState } = get()
      if (!hex || !canvas || !activeObject) return false
      if ((activeObject as { locked?: boolean }).locked) return false

      if (activeObject.type === "i-text") {
        get().applyTextStyle("fill", hex)
        return true
      }

      if ((activeObject as { elementName?: string }).elementName) {
        get().setElementColor(hex)
        return true
      }

      const fillable = activeObject as unknown as {
        fill?: unknown
        set: (key: string, value: unknown) => void
      }
      if (!("fill" in activeObject)) return false

      fillable.set("fill", hex)
      canvas.requestRenderAll()
      saveHistoryState("Brand colour")
      return true
    },

    saveBrandFontFromSelection: (role) => {
      const { activeObject } = get()
      if (activeObject?.type !== "i-text") return false
      const family = (activeObject as { fontFamily?: string }).fontFamily
      if (!family) return false
      commit(setFont(get().brandKit, role, family))
      return true
    },

    applyBrandFont: (role) => {
      const { activeObject } = get()
      const family = get().brandKit.fonts[role]
      if (!family || activeObject?.type !== "i-text") return false
      get().applyTextStyle("fontFamily", family)
      return true
    },

    clearBrandFont: (role) => {
      commit(setFont(get().brandKit, role, null))
    },

    addBrandLogo: async (file) => {
      if (!file.type.startsWith("image/")) return false

      const assetId = createAssetId()
      await putAsset(assetId, file.slice(0, file.size, file.type))
      const next = addLogo(get().brandKit, {
        id: createBrandId("logo"),
        assetId,
        name: file.name || "Logo",
      })
      commit(next)
      return true
    },

    removeBrandLogo: (id) => {
      commit(removeLogo(get().brandKit, id))
    },

    /**
     * Drops a stored logo onto the canvas.
     *
     * Stored by asset id like an imported photo, so the document keeps an id
     * rather than the pixels and the same logo can be placed again later. It is
     * sized to a third of the frame - a mark, not a second photo - and marked
     * so the layers list can name it.
     */
    placeBrandLogo: async (id) => {
      const { canvas, saveHistoryState } = get()
      if (!canvas) return false

      const logo = get().brandKit.logos.find((entry) => entry.id === id)
      if (!logo) return false

      const blob = await getAssetBlob(logo.assetId)
      if (!blob) {
        set({
          alertDialog: {
            title: "Logo missing",
            message:
              "This logo's file is no longer in browser storage. Add it to the brand kit again.",
          },
        })
        return false
      }

      try {
        const image = await FabricImage.fromURL(await blobToDataUrl(blob))
        const scale = Math.min(
          (canvas.getWidth() * 0.33) / (image.width || 1),
          (canvas.getHeight() * 0.33) / (image.height || 1),
          1
        )
        image.scale(scale)

        const tagged = image as FabricImage & {
          isLogo: boolean
          brandLogoId: string
          assetId: string
        }
        tagged.isLogo = true
        tagged.brandLogoId = logo.id
        tagged.assetId = logo.assetId

        canvas.add(image)
        canvas.centerObject(image)
        canvas.setActiveObject(image)
        canvas.requestRenderAll()
        saveHistoryState("Place logo")
        get().setActiveObject(image)
        return true
      } catch (error) {
        console.error("Could not place the logo:", error)
        return false
      }
    },
  }
}
