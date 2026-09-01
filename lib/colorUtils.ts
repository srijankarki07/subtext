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

//  ADVANCED COLOR MATH & HSL CONVERSIONS
export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h: h * 360, s, l }
}

export function hslToRgb(h: number, s: number, l: number) {
  let r, g, b
  h /= 360

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l)
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  )
}

export function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

// CONTEXT-AWARE COLOR HARMONY ENGINE

/**
 * Generates a visually appealing color that passes WCAG contrast.
 * It builds a pool of candidates (from the image palette, user's current hue, and color theory)
 * and scores them based on readability and aesthetic harmony.
 */
export function getSmartTextColor(
  currentTextHex: string,
  bgHex: string,
  palette: string[]
): string {
  const bgHsl = hexToHsl(bgHex)
  const textHsl = hexToHsl(currentTextHex)

  let candidates: { hex: string; source: string }[] = []

  // Helper to safely push candidates
  const addCandidate = (h: number, s: number, l: number, source: string) => {
    // Clamp lightness to ensure we don't output pure white/black unless necessary
    const clampedL = Math.max(0.05, Math.min(0.95, l))
    candidates.push({ hex: hslToHex(h, s, clampedL), source })
  }

  // 1. IMAGE PALETTE CANDIDATES (The cinematic look)
  palette.forEach((color) => {
    candidates.push({ hex: color, source: "palette_exact" })
    const pHsl = hexToHsl(color)
    // Add forced light/dark versions of the palette colors
    addCandidate(pHsl.h, pHsl.s, 0.9, "palette_tint")
    addCandidate(pHsl.h, pHsl.s, 0.1, "palette_shade")
  })

  // 2. USER INTENT CANDIDATES (Keep the user's chosen hue, just fix the contrast)
  addCandidate(textHsl.h, textHsl.s, 0.88, "intent_light")
  addCandidate(textHsl.h, textHsl.s, 0.12, "intent_dark")

  // 3. MONOCHROMATIC CANDIDATES (Blend seamlessly with the background)
  // e.g. A very dark navy blue text on a light blue background
  addCandidate(bgHsl.h, bgHsl.s, 0.92, "mono_light")
  addCandidate(bgHsl.h, bgHsl.s, 0.08, "mono_dark")

  // 4. COMPLEMENTARY CANDIDATES (Pop out from the background)
  const compHue = (bgHsl.h + 180) % 360
  addCandidate(compHue, Math.min(1, bgHsl.s + 0.2), 0.85, "comp_light")
  addCandidate(compHue, Math.min(1, bgHsl.s + 0.2), 0.15, "comp_dark")

  // Evaluate Candidates
  let bestCandidate = currentTextHex
  let bestScore = -1

  for (const { hex, source } of candidates) {
    const ratio = getContrastRatio(hex, bgHex)

    // Only consider colors that pass WCAG AA (4.5:1)
    if (ratio >= 4.5) {
      let score = ratio // Base score is readability

      // Aesthetic Multipliers (Reward colors that fit the cinematic theme)
      if (source === "palette_exact") score += 15 // Highest priority if an exact palette color works
      if (source === "intent_light" || source === "intent_dark") score += 10 // Respect user's hue
      if (source === "palette_tint" || source === "palette_shade") score += 8
      if (source.startsWith("mono")) score += 5

      // Penalize pure black and pure white slightly to prefer rich colors
      if (hex === "#000000" || hex === "#FFFFFF") score -= 2

      if (score > bestScore) {
        bestScore = score
        bestCandidate = hex
      }
    }
  }

  // Fallback: If absolutely no candidate passes (e.g. background is a mid-gray
  // where finding 4.5 contrast is mathematically impossible with these hues)
  if (bestScore === -1) {
    const { r, g, b } = hexToRgb(bgHex)
    const bgLuminance = getLuminance(r, g, b)
    return bgLuminance > 0.179 ? "#000000" : "#FFFFFF"
  }

  return bestCandidate
}
