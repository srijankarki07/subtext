// Dynamic Duotone Matrix Generator
export function getDuotoneMatrix(lightHex: string, darkHex: string): number[] {
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

  return [
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
}

// Warmth Matrix Generator (-100 to 100)
export function getWarmthMatrix(value: number): number[] {
  // Map -100..100 to a sensible range for color matrices (-0.5 to 0.5)
  const v = value / 200
  return [1, 0, 0, 0, v, 0, 1, 0, 0, v * 0.4, 0, 0, 1, 0, -v, 0, 0, 0, 1, 0]
}

// 12 Cinematic Presets
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
