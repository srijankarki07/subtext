export type FontCategory =
  "Serif" | "Sans-serif" | "Display" | "Script" | "Monospace"

export type FontUseCase =
  | "hero"
  | "title"
  | "subtitle"
  | "body"
  | "quote"
  | "poster"
  | "caption"
  | "fashion"
  | "cinematic"
  | "minimal"
  | "luxury"
  | "editorial"

export interface FontDef {
  id: string
  name: string
  category: FontCategory
  cssVariable: string
  fabricFamily: string

  /**
   * Optional metadata for smarter font recommendations.
   */
  useCases?: FontUseCase[]

  /**
   * Whether the font is particularly strong for cinematic/editorial designs.
   */
  premium?: boolean

  /**
   * Short description useful for tooltips.
   */
  description?: string
}

/**
 * All fonts available to the Subtext editor.
 *
 * Keep `id`, `cssVariable`, and `fabricFamily` stable once fonts
 * are being persisted in user projects.
 */
export const FONTS: FontDef[] = [
  // ============================================================
  // SERIF - EDITORIAL / LUXURY
  // ============================================================

  {
    id: "playfair",
    name: "Playfair Display",
    category: "Serif",
    cssVariable: "var(--font-playfair)",
    fabricFamily: "Playfair Display",
    useCases: ["hero", "title", "quote", "fashion", "luxury"],
    premium: true,
    description: "Elegant high-contrast editorial serif.",
  },

  {
    id: "cormorant",
    name: "Cormorant Garamond",
    category: "Serif",
    cssVariable: "var(--font-cormorant)",
    fabricFamily: "Cormorant Garamond",
    useCases: ["hero", "title", "quote", "fashion", "luxury"],
    premium: true,
    description: "Refined, artistic and highly expressive serif.",
  },

  {
    id: "bodoni",
    name: "Bodoni Moda",
    category: "Serif",
    cssVariable: "var(--font-bodoni)",
    fabricFamily: "Bodoni Moda",
    useCases: ["hero", "title", "fashion", "luxury", "poster"],
    premium: true,
    description: "High-fashion Didone typography.",
  },

  {
    id: "dm-serif",
    name: "DM Serif Display",
    category: "Serif",
    cssVariable: "var(--font-dm-serif)",
    fabricFamily: "DM Serif Display",
    useCases: ["hero", "title", "quote", "editorial" as FontUseCase],
    premium: true,
    description: "Bold contemporary editorial serif.",
  },

  {
    id: "libre-baskerville",
    name: "Libre Baskerville",
    category: "Serif",
    cssVariable: "var(--font-libre-baskerville)",
    fabricFamily: "Libre Baskerville",
    useCases: ["body", "quote", "subtitle", "editorial" as FontUseCase],
    description: "Classic, highly readable literary serif.",
  },

  {
    id: "libre-bodoni",
    name: "Libre Bodoni",
    category: "Serif",
    cssVariable: "var(--font-libre-bodoni)",
    fabricFamily: "Libre Bodoni",
    useCases: ["hero", "title", "fashion", "luxury"],
    premium: true,
    description: "Elegant modern interpretation of Bodoni.",
  },

  {
    id: "eb-garamond",
    name: "EB Garamond",
    category: "Serif",
    cssVariable: "var(--font-eb-garamond)",
    fabricFamily: "EB Garamond",
    useCases: ["quote", "body", "editorial", "luxury"],
    premium: true,
    description: "Timeless literary and classical serif.",
  },

  {
    id: "lora",
    name: "Lora",
    category: "Serif",
    cssVariable: "var(--font-lora)",
    fabricFamily: "Lora",
    useCases: ["body", "quote", "subtitle", "editorial"],
    description: "Contemporary serif with calligraphic character.",
  },

  {
    id: "merriweather",
    name: "Merriweather",
    category: "Serif",
    cssVariable: "var(--font-merriweather)",
    fabricFamily: "Merriweather",
    useCases: ["body", "quote", "subtitle"],
    description: "Strong and readable serif for longer text.",
  },

  {
    id: "baskervville",
    name: "Baskervville",
    category: "Serif",
    cssVariable: "var(--font-baskervville)",
    fabricFamily: "Baskervville",
    useCases: ["hero", "quote", "editorial", "luxury"],
    premium: true,
    description: "Elegant transitional serif with editorial character.",
  },

  {
    id: "prata",
    name: "Prata",
    category: "Serif",
    cssVariable: "var(--font-prata)",
    fabricFamily: "Prata",
    useCases: ["hero", "title", "fashion", "luxury"],
    premium: true,
    description: "Dramatic high-contrast display serif.",
  },

  {
    id: "libre-caslon",
    name: "Libre Caslon Display",
    category: "Serif",
    cssVariable: "var(--font-libre-caslon)",
    fabricFamily: "Libre Caslon Display",
    useCases: ["hero", "title", "quote", "editorial"],
    premium: true,
    description: "Expressive vintage-inspired editorial serif.",
  },

  {
    id: "yeseva",
    name: "Yeseva One",
    category: "Serif",
    cssVariable: "var(--font-yeseva)",
    fabricFamily: "Yeseva One",
    useCases: ["hero", "title", "fashion", "luxury"],
    premium: true,
    description: "Distinctive decorative serif for statement headlines.",
  },

  // ============================================================
  // SANS-SERIF - MODERN / PREMIUM
  // ============================================================

  {
    id: "inter",
    name: "Inter",
    category: "Sans-serif",
    cssVariable: "var(--font-inter)",
    fabricFamily: "Inter",
    useCases: ["body", "subtitle", "caption", "minimal"],
    description: "Clean, neutral and extremely versatile.",
  },

  {
    id: "montserrat",
    name: "Montserrat",
    category: "Sans-serif",
    cssVariable: "var(--font-montserrat)",
    fabricFamily: "Montserrat",
    useCases: ["title", "subtitle", "poster", "fashion"],
    premium: true,
    description: "Geometric and confident modern sans.",
  },

  {
    id: "manrope",
    name: "Manrope",
    category: "Sans-serif",
    cssVariable: "var(--font-manrope)",
    fabricFamily: "Manrope",
    useCases: ["subtitle", "body", "caption", "minimal", "luxury"],
    premium: true,
    description: "Polished modern sans with a premium feel.",
  },

  {
    id: "space-grotesk",
    name: "Space Grotesk",
    category: "Sans-serif",
    cssVariable: "var(--font-space-grotesk)",
    fabricFamily: "Space Grotesk",
    useCases: ["title", "subtitle", "cinematic", "minimal"],
    premium: true,
    description: "Distinctive contemporary grotesk.",
  },

  {
    id: "plus-jakarta",
    name: "Plus Jakarta Sans",
    category: "Sans-serif",
    cssVariable: "var(--font-plus-jakarta)",
    fabricFamily: "Plus Jakarta Sans",
    useCases: ["body", "subtitle", "caption", "minimal"],
    description: "Clean contemporary humanist sans.",
  },

  {
    id: "sora",
    name: "Sora",
    category: "Sans-serif",
    cssVariable: "var(--font-sora)",
    fabricFamily: "Sora",
    useCases: ["title", "subtitle", "minimal", "cinematic"],
    premium: true,
    description: "Geometric futuristic sans.",
  },

  {
    id: "outfit",
    name: "Outfit",
    category: "Sans-serif",
    cssVariable: "var(--font-outfit)",
    fabricFamily: "Outfit",
    useCases: ["title", "subtitle", "minimal", "fashion"],
    description: "Clean geometric contemporary font.",
  },

  {
    id: "dm-sans",
    name: "DM Sans",
    category: "Sans-serif",
    cssVariable: "var(--font-dm-sans)",
    fabricFamily: "DM Sans",
    useCases: ["body", "subtitle", "caption", "minimal"],
    description: "Friendly and highly versatile modern sans.",
  },

  {
    id: "raleway",
    name: "Raleway",
    category: "Sans-serif",
    cssVariable: "var(--font-raleway)",
    fabricFamily: "Raleway",
    useCases: ["title", "subtitle", "fashion", "luxury"],
    premium: true,
    description: "Elegant lightweight geometric sans.",
  },

  {
    id: "work-sans",
    name: "Work Sans",
    category: "Sans-serif",
    cssVariable: "var(--font-work-sans)",
    fabricFamily: "Work Sans",
    useCases: ["body", "subtitle", "caption"],
    description: "Neutral modern sans for supporting text.",
  },

  {
    id: "nunito-sans",
    name: "Nunito Sans",
    category: "Sans-serif",
    cssVariable: "var(--font-nunito-sans)",
    fabricFamily: "Nunito Sans",
    useCases: ["body", "subtitle", "caption"],
    description: "Soft and approachable sans-serif.",
  },

  {
    id: "josefin",
    name: "Josefin Sans",
    category: "Sans-serif",
    cssVariable: "var(--font-josefin)",
    fabricFamily: "Josefin Sans",
    useCases: ["title", "fashion", "poster"],
    premium: true,
    description: "Elegant geometric display sans.",
  },

  {
    id: "archivo",
    name: "Archivo",
    category: "Sans-serif",
    cssVariable: "var(--font-archivo)",
    fabricFamily: "Archivo",
    useCases: ["title", "subtitle", "poster", "cinematic"],
    description: "Strong contemporary grotesk.",
  },

  {
    id: "barlow",
    name: "Barlow",
    category: "Sans-serif",
    cssVariable: "var(--font-barlow)",
    fabricFamily: "Barlow",
    useCases: ["subtitle", "poster", "cinematic"],
    description: "Industrial modern sans.",
  },

  {
    id: "roboto-condensed",
    name: "Roboto Condensed",
    category: "Sans-serif",
    cssVariable: "var(--font-roboto-condensed)",
    fabricFamily: "Roboto Condensed",
    useCases: ["title", "poster", "cinematic"],
    description: "Compact and highly readable condensed sans.",
  },

  {
    id: "lexend",
    name: "Lexend",
    category: "Sans-serif",
    cssVariable: "var(--font-lexend)",
    fabricFamily: "Lexend",
    useCases: ["body", "subtitle", "caption"],
    description: "Highly legible modern sans.",
  },

  // ============================================================
  // DISPLAY - CINEMATIC / POSTER
  // ============================================================

  {
    id: "cinzel",
    name: "Cinzel",
    category: "Display",
    cssVariable: "var(--font-cinzel)",
    fabricFamily: "Cinzel",
    useCases: ["hero", "title", "poster", "cinematic", "luxury"],
    premium: true,
    description: "Classical cinematic display typography.",
  },

  {
    id: "bebas",
    name: "Bebas Neue",
    category: "Display",
    cssVariable: "var(--font-bebas)",
    fabricFamily: "Bebas Neue",
    useCases: ["hero", "title", "poster", "cinematic"],
    premium: true,
    description: "Iconic condensed movie-poster display face.",
  },

  {
    id: "oswald",
    name: "Oswald",
    category: "Display",
    cssVariable: "var(--font-oswald)",
    fabricFamily: "Oswald",
    useCases: ["hero", "title", "poster", "cinematic"],
    description: "Strong condensed display sans.",
  },

  {
    id: "abril",
    name: "Abril Fatface",
    category: "Display",
    cssVariable: "var(--font-abril)",
    fabricFamily: "Abril Fatface",
    useCases: ["hero", "title", "fashion", "luxury"],
    premium: true,
    description: "Bold editorial display serif.",
  },

  {
    id: "anton",
    name: "Anton",
    category: "Display",
    cssVariable: "var(--font-anton)",
    fabricFamily: "Anton",
    useCases: ["hero", "title", "poster", "cinematic"],
    description: "Heavy condensed headline font.",
  },

  {
    id: "archivo-black",
    name: "Archivo Black",
    category: "Display",
    cssVariable: "var(--font-archivo-black)",
    fabricFamily: "Archivo Black",
    useCases: ["hero", "title", "poster", "cinematic"],
    description: "Heavy modern display grotesk.",
  },

  {
    id: "big-shoulders",
    name: "Big Shoulders Display",
    category: "Display",
    cssVariable: "var(--font-big-shoulders)",
    fabricFamily: "Big Shoulders Display",
    useCases: ["hero", "title", "poster", "cinematic"],
    premium: true,
    description: "Wide expressive cinematic display face.",
  },

  {
    id: "teko",
    name: "Teko",
    category: "Display",
    cssVariable: "var(--font-teko)",
    fabricFamily: "Teko",
    useCases: ["hero", "title", "poster", "cinematic"],
    description: "Tall condensed display typography.",
  },

  {
    id: "league-spartan",
    name: "League Spartan",
    category: "Display",
    cssVariable: "var(--font-league-spartan)",
    fabricFamily: "League Spartan",
    useCases: ["hero", "title", "poster", "minimal"],
    description: "Bold geometric display sans.",
  },

  {
    id: "unbounded",
    name: "Unbounded",
    category: "Display",
    cssVariable: "var(--font-unbounded)",
    fabricFamily: "Unbounded",
    useCases: ["hero", "title", "poster", "cinematic"],
    premium: true,
    description: "Futuristic experimental display font.",
  },

  {
    id: "syne",
    name: "Syne",
    category: "Display",
    cssVariable: "var(--font-syne)",
    fabricFamily: "Syne",
    useCases: ["hero", "title", "fashion", "cinematic"],
    premium: true,
    description: "Artistic contemporary display type.",
  },

  {
    id: "major-mono",
    name: "Major Mono Display",
    category: "Display",
    cssVariable: "var(--font-major-mono)",
    fabricFamily: "Major Mono Display",
    useCases: ["title", "poster", "cinematic"],
    premium: true,
    description: "Experimental monospaced display font.",
  },

  {
    id: "black-ops",
    name: "Black Ops One",
    category: "Display",
    cssVariable: "var(--font-black-ops)",
    fabricFamily: "Black Ops One",
    useCases: ["title", "poster", "cinematic"],
    description: "Military-inspired bold display type.",
  },

  {
    id: "limelight",
    name: "Limelight",
    category: "Display",
    cssVariable: "var(--font-limelight)",
    fabricFamily: "Limelight",
    useCases: ["title", "poster", "cinematic", "fashion"],
    premium: true,
    description: "Art Deco-inspired cinematic display.",
  },

  {
    id: "marcellus",
    name: "Marcellus",
    category: "Display",
    cssVariable: "var(--font-marcellus)",
    fabricFamily: "Marcellus",
    useCases: ["hero", "title", "cinematic", "luxury"],
    premium: true,
    description: "Classical Roman-inspired display face.",
  },

  {
    id: "bungee",
    name: "Bungee",
    category: "Display",
    cssVariable: "var(--font-bungee)",
    fabricFamily: "Bungee",
    useCases: ["title", "poster"],
    description: "Bold architectural display font.",
  },

  // ============================================================
  // SCRIPT - SIGNATURE / LUXURY
  // ============================================================

  {
    id: "dancing",
    name: "Dancing Script",
    category: "Script",
    cssVariable: "var(--font-dancing)",
    fabricFamily: "Dancing Script",
    useCases: ["quote", "fashion", "luxury"],
    description: "Casual expressive handwritten script.",
  },

  {
    id: "great-vibes",
    name: "Great Vibes",
    category: "Script",
    cssVariable: "var(--font-great-vibes)",
    fabricFamily: "Great Vibes",
    useCases: ["hero", "quote", "fashion", "luxury"],
    premium: true,
    description: "Elegant calligraphic signature style.",
  },

  {
    id: "allura",
    name: "Allura",
    category: "Script",
    cssVariable: "var(--font-allura)",
    fabricFamily: "Allura",
    useCases: ["quote", "fashion", "luxury"],
    premium: true,
    description: "Elegant lightweight calligraphic script.",
  },

  {
    id: "ballet",
    name: "Ballet",
    category: "Script",
    cssVariable: "var(--font-ballet)",
    fabricFamily: "Ballet",
    useCases: ["hero", "quote", "fashion", "luxury"],
    premium: true,
    description: "Dramatic high-fashion script.",
  },

  {
    id: "parisienne",
    name: "Parisienne",
    category: "Script",
    cssVariable: "var(--font-parisienne)",
    fabricFamily: "Parisienne",
    useCases: ["quote", "fashion", "luxury"],
    premium: true,
    description: "Elegant handwritten fashion script.",
  },

  {
    id: "lobster",
    name: "Lobster",
    category: "Script",
    cssVariable: "var(--font-lobster)",
    fabricFamily: "Lobster",
    useCases: ["title", "quote", "fashion"],
    description: "Bold retro script.",
  },

  // ============================================================
  // MONOSPACE / TECH
  // ============================================================

  {
    id: "geist-mono",
    name: "Geist Mono",
    category: "Monospace",
    cssVariable: "var(--font-mono)",
    fabricFamily: "Geist Mono",
    useCases: ["caption", "subtitle", "cinematic", "minimal"],
    description: "Modern technical monospace.",
  },

  {
    id: "space-mono",
    name: "Space Mono",
    category: "Monospace",
    cssVariable: "var(--font-space-mono)",
    fabricFamily: "Space Mono",
    useCases: ["caption", "subtitle", "cinematic"],
    description: "Editorial monospace with personality.",
  },

  {
    id: "azeret-mono",
    name: "Azeret Mono",
    category: "Monospace",
    cssVariable: "var(--font-azeret-mono)",
    fabricFamily: "Azeret Mono",
    useCases: ["caption", "subtitle", "cinematic", "minimal"],
    description: "Contemporary expressive monospace.",
  },
]

/**
 * Curated combinations for one-click cinematic typography.
 *
 * Existing pairings are intentionally preserved.
 */
export const FONT_PAIRINGS = [
  // Existing
  {
    header: "playfair",
    body: "montserrat",
    name: "Classic Editorial",
  },
  {
    header: "cinzel",
    body: "inter",
    name: "Cinematic Modern",
  },

  // New premium combinations
  {
    header: "bodoni",
    body: "manrope",
    name: "Luxury Editorial",
  },
  {
    header: "cormorant",
    body: "inter",
    name: "Elegant Minimal",
  },
  {
    header: "dm-serif",
    body: "manrope",
    name: "Art House",
  },
  {
    header: "libre-bodoni",
    body: "montserrat",
    name: "Fashion Film",
  },
  {
    header: "prata",
    body: "manrope",
    name: "Luxury Cinema",
  },
  {
    header: "abril",
    body: "montserrat",
    name: "Fashion Campaign",
  },
  {
    header: "bebas",
    body: "inter",
    name: "Movie Poster",
  },
  {
    header: "bebas",
    body: "manrope",
    name: "Modern Poster",
  },
  {
    header: "oswald",
    body: "inter",
    name: "Classic Cinema",
  },
  {
    header: "anton",
    body: "inter",
    name: "Blockbuster",
  },
  {
    header: "big-shoulders",
    body: "manrope",
    name: "Wide Cinema",
  },
  {
    header: "cinzel",
    body: "cormorant",
    name: "Epic Romance",
  },
  {
    header: "marcellus",
    body: "inter",
    name: "Ancient Cinema",
  },
  {
    header: "space-grotesk",
    body: "inter",
    name: "Contemporary",
  },
  {
    header: "sora",
    body: "inter",
    name: "Future Modern",
  },
  {
    header: "unbounded",
    body: "space-grotesk",
    name: "Futuristic",
  },
  {
    header: "syne",
    body: "manrope",
    name: "Creative Studio",
  },
  {
    header: "great-vibes",
    body: "montserrat",
    name: "Luxury Script",
  },
  {
    header: "ballet",
    body: "manrope",
    name: "Haute Couture",
  },
  {
    header: "allura",
    body: "montserrat",
    name: "Elegant Signature",
  },
  {
    header: "libre-caslon",
    body: "inter",
    name: "Indie Film",
  },
  {
    header: "yeseva",
    body: "manrope",
    name: "Editorial Drama",
  },
  {
    header: "limelight",
    body: "inter",
    name: "Art Deco",
  },
  {
    header: "major-mono",
    body: "space-grotesk",
    name: "Digital Film",
  },
]

export function getFontById(id: string): FontDef | undefined {
  return FONTS.find((font) => font.id === id)
}

export function getFontsByCategory(category: FontCategory): FontDef[] {
  return FONTS.filter((font) => font.category === category)
}

export function getPremiumFonts(): FontDef[] {
  return FONTS.filter((font) => font.premium)
}

export function getFontsForUseCase(useCase: FontUseCase): FontDef[] {
  return FONTS.filter((font) => font.useCases?.includes(useCase))
}
