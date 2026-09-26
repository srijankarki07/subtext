import { getPalette } from "colorthief"

/**
 * Palette extraction.
 *
 * This file used to hold a second, hand-rolled implementation of WCAG
 * luminance and contrast alongside the palette extractor, plus a bespoke
 * HSL-harmony colour recommender. All of it was superseded by
 * `lib/visibility.ts`, which does the colour maths through `culori` — so the
 * app had two answers to "what is this colour's contrast" and only one of them
 * was being maintained. The dead helpers are gone; the palette extractor stays.
 */

/** Fallback when an image cannot be sampled, so callers always get colours. */
const FALLBACK_PALETTE = [
  "#FFFFFF",
  "#000000",
  "#1C1C1E",
  "#32D74B",
  "#0A84FF",
  "#FF453A",
]

export function extractPalette(
  imgUrl: string,
  colorCount: number = 6
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.crossOrigin = "Anonymous"

    img.onload = async () => {
      try {
        const palette = await getPalette(img, { colorCount })

        if (!palette) throw new Error("No colors extracted")

        resolve(palette.map((color) => color.hex().toUpperCase()))
      } catch (error) {
        console.error("Color extraction failed:", error)
        resolve(FALLBACK_PALETTE)
      }
    }

    img.onerror = () => {
      reject(new Error("Failed to load image for extraction"))
    }

    img.src = imgUrl
  })
}
