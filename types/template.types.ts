export type TemplateCategory =
  "All" | "Cinematic" | "Editorial" | "Aesthetic" | "Bold" | "Vintage"

export interface TemplateTextConfig {
  type: "quote" | "author" | "handle" | "custom"
  text?: string
  fontFamily: string
  fontSize: number
  fontWeight: number | string
  fontStyle?: "normal" | "italic"
  textAlign?: "left" | "center" | "right"
  fill: string
  charSpacing?: number
  lineHeight?: number

  // Positioning (0 to 1 relative to canvas dimensions)
  left: number
  top: number
  originX?: "left" | "center" | "right"
  originY?: "top" | "center" | "bottom"

  shadow?: { color: string; blur: number; offsetX: number; offsetY: number }
  stroke?: string
  strokeWidth?: number
}

export interface TemplateEffectsConfig {
  presetName: string // Maps to keys in CINEMATIC_PRESETS
  brightness?: number
  contrast?: number
  saturation?: number
  warmth?: number
  grainIntensity?: number
  gradientOpacity?: number
  vignette?: { opacity: number; type: "radial" | "linear"; color: string }
  duotone?: { lightHex: string; darkHex: string }
  letterbox?: number // thickness ratio (e.g., 10 for 10%)
}

export interface Template {
  id: string
  name: string
  category: TemplateCategory
  texts: TemplateTextConfig[]
  effects: TemplateEffectsConfig
}
