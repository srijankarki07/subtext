export type FontCategory = "Serif" | "Sans-serif" | "Display" | "Script"

export interface FontDef {
  id: string
  name: string
  category: FontCategory
  cssVariable: string // Used for UI previews
  fabricFamily: string // Exact name Fabric uses to render the font
}

export const FONTS: FontDef[] = [
  // SERIF
  {
    id: "playfair",
    name: "Playfair Display",
    category: "Serif",
    cssVariable: "var(--font-playfair)",
    fabricFamily: "Playfair Display",
  },
  {
    id: "cormorant",
    name: "Cormorant Garamond",
    category: "Serif",
    cssVariable: "var(--font-cormorant)",
    fabricFamily: "Cormorant Garamond",
  },

  // SANS-SERIF
  {
    id: "inter",
    name: "Inter",
    category: "Sans-serif",
    cssVariable: "var(--font-inter)",
    fabricFamily: "Inter",
  },
  {
    id: "montserrat",
    name: "Montserrat",
    category: "Sans-serif",
    cssVariable: "var(--font-montserrat)",
    fabricFamily: "Montserrat",
  },

  // DISPLAY & SCRIPT
  {
    id: "cinzel",
    name: "Cinzel",
    category: "Display",
    cssVariable: "var(--font-cinzel)",
    fabricFamily: "Cinzel",
  },
  {
    id: "dancing",
    name: "Dancing Script",
    category: "Script",
    cssVariable: "var(--font-dancing)",
    fabricFamily: "Dancing Script",
  },
]

export const FONT_PAIRINGS = [
  { header: "playfair", body: "montserrat", name: "Classic Editorial" },
  { header: "cinzel", body: "inter", name: "Cinematic Modern" },
]
