import {
  CustomFontMetadata,
  deleteStoredCustomFont,
  getCustomFontFamily,
  getCustomFontMetadata,
  listStoredCustomFonts,
  registerCustomFont,
  saveStoredCustomFont,
  validateCustomFontFile,
} from "@/lib/customFonts"
import { EditorStore, FontSlice } from "@/types/store.types"
import { StateCreator } from "zustand"

function createFontId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const createFontSlice: StateCreator<EditorStore, [], [], FontSlice> = (
  set
) => ({
  customFonts: [],
  customFontsLoading: false,
  customFontError: null,

  initializeCustomFonts: async () => {
    if (typeof window === "undefined") return

    set({ customFontsLoading: true, customFontError: null })

    try {
      const storedFonts = await listStoredCustomFonts()
      const loadedFonts: CustomFontMetadata[] = []

      for (const font of storedFonts) {
        try {
          await registerCustomFont(font)
          loadedFonts.push(getCustomFontMetadata(font))
        } catch (error) {
          console.error(`Failed to load custom font ${font.name}:`, error)
        }
      }

      set({ customFonts: loadedFonts, customFontsLoading: false })
    } catch (error) {
      console.error("Failed to initialize custom fonts:", error)
      set({
        customFonts: [],
        customFontsLoading: false,
        customFontError: "Uploaded fonts could not be loaded.",
      })
    }
  },

  uploadCustomFont: async (file) => {
    const validationError = validateCustomFontFile(file)
    if (validationError) {
      set({ customFontError: validationError })
      return false
    }

    set({ customFontsLoading: true, customFontError: null })

    try {
      const id = createFontId()
      const storedFont = {
        id,
        name: file.name.replace(/\.[^/.]+$/, ""),
        family: getCustomFontFamily(id),
        format: file.name.split(".").pop()!.toLowerCase() as
          "ttf" | "otf" | "woff" | "woff2",
        size: file.size,
        data: await file.arrayBuffer(),
        createdAt: Date.now(),
      }

      await registerCustomFont(storedFont)
      await saveStoredCustomFont(storedFont)

      set((state) => ({
        customFonts: [...state.customFonts, getCustomFontMetadata(storedFont)],
        customFontsLoading: false,
        customFontError: null,
      }))
      return true
    } catch (error) {
      console.error("Failed to upload custom font:", error)
      set({
        customFontsLoading: false,
        customFontError: "This file could not be loaded as a font.",
      })
      return false
    }
  },

  removeCustomFont: async (id) => {
    set({ customFontError: null })

    try {
      await deleteStoredCustomFont(id)
      set((state) => ({
        customFonts: state.customFonts.filter((font) => font.id !== id),
      }))
      return true
    } catch (error) {
      console.error("Failed to remove custom font:", error)
      set({ customFontError: "The uploaded font could not be removed." })
      return false
    }
  },
})
