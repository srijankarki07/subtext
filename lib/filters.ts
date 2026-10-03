/** Identity colour matrix: leaves the image untouched. */
const IDENTITY_MATRIX = [
  1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
]

/**
 * Dynamic Duotone Matrix Generator.
 *
 * `intensity` blends the duotone against the untouched image. Both operations
 * are linear maps over RGB, so interpolating their coefficients is exactly the
 * same as cross-fading the two results — no second filter needed, and 0 gives
 * back the original image precisely.
 */
export function getDuotoneMatrix(
  lightHex: string,
  darkHex: string,
  intensity = 100
): number[] {
  // Convert Hex to RGB
  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.replace("#", ""), 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
  }

  const light = hexToRgb(lightHex)
  const dark = hexToRgb(darkHex)

  // Calculate the difference mapped across luminance
  const dR = (light[0] - dark[0]) / 255
  const dG = (light[1] - dark[1]) / 255
  const dB = (light[2] - dark[2]) / 255

  // Luminance weights (Standard Rec. 601)
  const lR = 0.299,
    lG = 0.587,
    lB = 0.114

  const duotone = [
    dR * lR,
    dR * lG,
    dR * lB,
    0,
    dark[0] / 255,
    dG * lR,
    dG * lG,
    dG * lB,
    0,
    dark[1] / 255,
    dB * lR,
    dB * lG,
    dB * lB,
    0,
    dark[2] / 255,
    0,
    0,
    0,
    1,
    0,
  ]

  const blend = Math.max(0, Math.min(1, intensity / 100))
  if (blend >= 1) return duotone

  return duotone.map(
    (value, index) => IDENTITY_MATRIX[index] * (1 - blend) + value * blend
  )
}

// Warmth Matrix Generator (-100 to 100)
export function getWarmthMatrix(value: number): number[] {
  // Map -100..100 to a sensible range for color matrices (-0.5 to 0.5)
  const v = value / 200
  return [1, 0, 0, 0, v, 0, 1, 0, 0, v * 0.4, 0, 0, 1, 0, -v, 0, 0, 0, 1, 0]
}

// 12 Cinematic Presets (Matrices)
export const CINEMATIC_PRESETS: Record<string, number[]> = {
  None: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  Matrix: [
    0.3, 0.6, 0.1, 0, 0, 0.1, 0.9, 0.2, 0, 0, 0.1, 0.5, 0.4, 0, 0, 0, 0, 0, 1,
    0,
  ],
  BladeRunner: [
    1.2, 0.2, 0.1, 0, 0.1, 0.1, 0.8, 0.5, 0, 0.05, 0.0, 0.3, 1.4, 0, 0.1, 0, 0,
    0, 1, 0,
  ],
  Amelie: [
    1.2, 0.1, 0.0, 0, 0.1, 0.2, 1.1, 0.0, 0, 0.1, 0.0, 0.2, 0.7, 0, -0.1, 0, 0,
    0, 1, 0,
  ],
  "Teal & Orange": [
    1.2, -0.1, -0.1, 0, 0.1, -0.1, 1.1, 0.2, 0, 0.05, -0.2, 0.2, 1.3, 0, 0.15,
    0, 0, 0, 1, 0,
  ],
  Cyberpunk: [
    1.4, 0.0, 0.4, 0, 0.1, 0.0, 0.9, 0.3, 0, -0.1, 0.4, 0.0, 1.4, 0, 0.2, 0, 0,
    0, 1, 0,
  ],
  Vintage: [
    0.9, 0.1, 0.1, 0, 0.1, 0.1, 0.8, 0.1, 0, 0.05, 0.1, 0.1, 0.6, 0, -0.1, 0, 0,
    0, 1, 0,
  ],
  Sepia: [
    0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131,
    0, 0, 0, 0, 0, 1, 0,
  ],
  Noir: [
    0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0,
    0, 0, 1, 0,
  ],
  "High Contrast": [
    1.5, 0, 0, 0, -0.2, 0, 1.5, 0, 0, -0.2, 0, 0, 1.5, 0, -0.2, 0, 0, 0, 1, 0,
  ],
  Faded: [
    0.8, 0, 0, 0, 0.1, 0, 0.8, 0, 0, 0.1, 0, 0, 0.8, 0, 0.1, 0, 0, 0, 1, 0,
  ],
  Dreamy: [
    1.1, 0.1, 0.2, 0, 0.05, 0.1, 1.1, 0.2, 0, 0.05, 0.2, 0.1, 1.2, 0, 0.1, 0, 0,
    0, 1, 0,
  ],
}

// Preset Details for UI Cards & (i) tooltips
export interface PresetMeta {
  name: string
  description: string
  accentColor: string
}

export const CINEMATIC_PRESET_METADATA: PresetMeta[] = [
  {
    name: "None",
    description: "Neutral / Raw image tones",
    accentColor: "#8E8E93",
  },
  {
    name: "Matrix",
    description: "Green phosphor dystopian tint",
    accentColor: "#32D74B",
  },
  {
    name: "BladeRunner",
    description: "Cyan shadows with warm neon amber",
    accentColor: "#FF9F0A",
  },
  {
    name: "Amelie",
    description: "Warm French golden-green whimsy",
    accentColor: "#D6B47A",
  },
  {
    name: "Teal & Orange",
    description: "Hollywood blockbuster skin & sky contrast",
    accentColor: "#0A84FF",
  },
  {
    name: "Cyberpunk",
    description: "Electric magenta and ultraviolet pop",
    accentColor: "#FF375F",
  },
  {
    name: "Vintage",
    description: "Faded 70s print film emulation",
    accentColor: "#C7A779",
  },
  {
    name: "Sepia",
    description: "Warm antique monochrome look",
    accentColor: "#A2703F",
  },
  {
    name: "Noir",
    description: "High-contrast black & white drama",
    accentColor: "#EBEBF5",
  },
  {
    name: "High Contrast",
    description: "Crushed rich shadows and punchy lights",
    accentColor: "#FFFFFF",
  },
  {
    name: "Faded",
    description: "Matte shadows with low dynamic range",
    accentColor: "#7A7E85",
  },
  {
    name: "Dreamy",
    description: "Soft romantic pastel glow and haze",
    accentColor: "#BF5AF2",
  },
]
