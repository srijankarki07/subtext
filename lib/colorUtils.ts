import { getPalette } from "colorthief"

//WCAG 2.1 LUMINANCE & CONTRAST MATH
export function hexToRgb(hex: string) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const fullHex = hex.replace(
    shorthandRegex,
    (m, r, g, b) => r + r + g + g + b + b
  )

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)

  const l1 = getLuminance(c1.r, c1.g, c1.b)
  const l2 = getLuminance(c2.r, c2.g, c2.b)

  const lightest = Math.max(l1, l2)
  const darkest = Math.min(l1, l2)

  return (lightest + 0.05) / (darkest + 0.05)
}

// VISIBILITY SCORING & COMPLIANCE
export function getVisibilityScore(
  ratio: number,
  fontSize: number,
  fontWeight: number
): number {
  let baseScore = 0

  // Scale based on WCAG thresholds
  if (ratio >= 7.0) baseScore = 90
  else if (ratio >= 4.5) baseScore = 75
  else if (ratio >= 3.0) baseScore = 55
  else baseScore = (ratio / 3) * 50 // Heavy penalty for failing contrast

  // Bonus modifiers for typographical readability
  const sizeBonus = fontSize > 36 ? 10 : fontSize > 24 ? 5 : 0
  const weightBonus = fontWeight >= 600 ? 5 : 0

  return Math.min(100, Math.round(baseScore + sizeBonus + weightBonus))
}

export function getComplianceBadge(
  ratio: number,
  fontSize: number,
  fontWeight: number
): "AAA" | "AA" | "FAIL" {
  // WCAG defines "Large Text" as 18pt (24px) + bold, or 14pt (18px) + normal.
  // We'll approximate for Fabric canvas space.
  const isLargeText = fontSize >= 36 || (fontSize >= 24 && fontWeight >= 700)

  if (ratio >= 7.0) return "AAA"
  if (ratio >= 4.5) return "AA"
  if (ratio >= 3.0 && isLargeText) return "AA"
  return "FAIL"
}

//COLOR THIEF IMAGE EXTRACTION
export function extractPalette(
  imgUrl: string,
  colorCount: number = 6
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.crossOrigin = "Anonymous"

    img.onload = async () => {
      try {
        const palette = await getPalette(img, {
          colorCount,
        })

        if (!palette) {
          throw new Error("No colors extracted")
        }

        const hexPalette = palette.map((color) => color.hex().toUpperCase())

        resolve(hexPalette)
      } catch (error) {
        console.error("Color extraction failed:", error)

        resolve([
          "#FFFFFF",
          "#000000",
          "#1C1C1E",
          "#32D74B",
          "#0A84FF",
          "#FF453A",
        ])
      }
    }

    img.onerror = () => {
      reject(new Error("Failed to load image for extraction"))
    }

    img.src = imgUrl
  })
}
