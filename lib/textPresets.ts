/**
 * Named text styles.
 *
 * A preset is the whole look, not one control: family, size, weight, spacing,
 * alignment, fill, outline and shadow applied in a single step. The list is
 * data so the inspector and the command palette render from one source, the
 * same way templates and fonts already do.
 *
 * The families named here are the ones `app/layout.tsx` actually loads. A
 * preset that named an unloaded face would fall back silently on the artboard,
 * so adding one means checking the layout first.
 */

export interface TextShadowDef {
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface TextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: "normal" | "italic"
  /** Fabric's unit: 1/1000 em. */
  charSpacing: number
  lineHeight: number
  textAlign: "left" | "center" | "right"
  fill: string
  stroke: string | null
  strokeWidth: number
  shadow: TextShadowDef | null
}

export interface TextPreset {
  id: string
  name: string
  /** One line for a tooltip; the palette uses the keywords instead. */
  description: string
  keywords: string
  style: TextStyle
}

/** Transparent fill, used by the hollow treatment. */
const NO_FILL = "rgba(0,0,0,0)"

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: "display",
    name: "Display",
    description: "A confident serif with a soft drop shadow.",
    keywords: "serif poster headline playfair",
    style: {
      fontFamily: "Playfair Display",
      fontSize: 72,
      fontWeight: 700,
      fontStyle: "normal",
      charSpacing: 0,
      lineHeight: 1.05,
      textAlign: "center",
      fill: "#FFFFFF",
      stroke: null,
      strokeWidth: 0,
      shadow: { color: "rgba(0,0,0,0.45)", blur: 16, offsetX: 0, offsetY: 6 },
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Light serif with air between the letters.",
    keywords: "serif magazine pull quote cormorant",
    style: {
      fontFamily: "Cormorant Garamond",
      fontSize: 64,
      fontWeight: 500,
      fontStyle: "normal",
      charSpacing: 40,
      lineHeight: 1.2,
      textAlign: "center",
      fill: "#F5F4EF",
      stroke: null,
      strokeWidth: 0,
      shadow: null,
    },
  },
  {
    id: "poster",
    name: "Poster",
    description: "Condensed and loud, built for a thumbnail.",
    keywords: "sans condensed bold anton street",
    style: {
      fontFamily: "Anton",
      fontSize: 88,
      fontWeight: 400,
      fontStyle: "normal",
      charSpacing: 10,
      lineHeight: 0.95,
      textAlign: "center",
      fill: "#FFFFFF",
      stroke: null,
      strokeWidth: 0,
      shadow: null,
    },
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Wide-tracked gold from a title card.",
    keywords: "film title gold wide tracked big shoulders",
    style: {
      fontFamily: "Big Shoulders Display",
      fontSize: 72,
      fontWeight: 700,
      fontStyle: "normal",
      charSpacing: 120,
      lineHeight: 1,
      textAlign: "center",
      fill: "#D6B47A",
      stroke: null,
      strokeWidth: 0,
      shadow: { color: "rgba(0,0,0,0.6)", blur: 20, offsetX: 0, offsetY: 4 },
    },
  },
  {
    id: "caption",
    name: "Caption",
    description: "Small, quiet, widely spaced.",
    keywords: "small minimal label credits inter",
    style: {
      fontFamily: "Inter",
      fontSize: 18,
      fontWeight: 500,
      fontStyle: "normal",
      charSpacing: 300,
      lineHeight: 1.4,
      textAlign: "center",
      fill: "#FFFFFF",
      stroke: null,
      strokeWidth: 0,
      shadow: null,
    },
  },
  {
    id: "hollow",
    name: "Hollow",
    description: "Outline only; the photograph shows through.",
    keywords: "outline stroke transparent hollow",
    style: {
      fontFamily: "Playfair Display",
      fontSize: 80,
      fontWeight: 700,
      fontStyle: "normal",
      charSpacing: 20,
      lineHeight: 1.05,
      textAlign: "center",
      fill: NO_FILL,
      stroke: "#FFFFFF",
      strokeWidth: 1.5,
      shadow: null,
    },
  },
  {
    id: "neon",
    name: "Neon",
    description: "A coloured glow with no hard edge.",
    keywords: "glow light electric cyan shadow",
    style: {
      fontFamily: "Montserrat",
      fontSize: 64,
      fontWeight: 700,
      fontStyle: "normal",
      charSpacing: 40,
      lineHeight: 1.1,
      textAlign: "center",
      fill: "#7DF9FF",
      stroke: null,
      strokeWidth: 0,
      shadow: { color: "#7DF9FF", blur: 40, offsetX: 0, offsetY: 0 },
    },
  },
  {
    id: "lift",
    name: "Lift",
    description: "A long shadow that lifts the line off the image.",
    keywords: "shadow elevation depth float",
    style: {
      fontFamily: "Inter",
      fontSize: 56,
      fontWeight: 700,
      fontStyle: "normal",
      charSpacing: 20,
      lineHeight: 1.15,
      textAlign: "center",
      fill: "#FFFFFF",
      stroke: null,
      strokeWidth: 0,
      shadow: { color: "rgba(0,0,0,0.55)", blur: 30, offsetX: 0, offsetY: 12 },
    },
  },
  {
    id: "gold",
    name: "Gold",
    description: "A warm serif with a short shadow.",
    keywords: "luxury gold serif dm serif",
    style: {
      fontFamily: "DM Serif Display",
      fontSize: 72,
      fontWeight: 400,
      fontStyle: "normal",
      charSpacing: 30,
      lineHeight: 1.1,
      textAlign: "center",
      fill: "#E6C27A",
      stroke: null,
      strokeWidth: 0,
      shadow: { color: "rgba(0,0,0,0.5)", blur: 12, offsetX: 0, offsetY: 3 },
    },
  },
]

export function textPresetById(id: string): TextPreset | undefined {
  return TEXT_PRESETS.find((preset) => preset.id === id)
}
