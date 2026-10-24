import type { Canvas } from "fabric"

import { getAssetBlob, releaseIssuedAssetUrls } from "@/lib/assets"
// Side-effect import: registers the ToneCurve filter class before any document
// is deserialised. Without it a saved curve comes back as an inert plain object.
import "@/lib/toneFilter"
import { DOCUMENT_PROPERTIES } from "@/lib/fabricDocument"
import type {
  BlurZoneState,
  LetterboxState,
  VignetteState,
} from "@/types/store.types"

/**
 * Document snapshots.
 *
 * Two things a snapshot has to get right:
 *
 * 1. **It must not carry the photo.** Fabric writes an image's pixels into its
 *    JSON as a base64 data URL, so the previous snapshots held a full copy of
 *    the photo each - thirty copies, and the same payload went to
 *    `localStorage`. Snapshots now keep only the asset id and re-hydrate the
 *    bytes from IndexedDB when restored.
 *
 * 2. **It must cover more than the canvas.** Grading and overlay state lives in
 *    the store, not in the Fabric object graph, so undoing used to leave the
 *    panel showing a vignette whose slider did nothing and whose Remove button
 *    referred to an object that no longer existed.
 */

/** The parts of the document that live outside the Fabric object graph. */
export interface EffectSnapshot {
  grainIntensity: number
  gradientOpacity: number
  vignettes: VignetteState[]
  blurZones: BlurZoneState[]
  letterboxes: LetterboxState[]
  duotoneLight: string
  duotoneDark: string
  duotoneIntensity: number
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  imagePalette: string[]
}

export function captureEffects(state: Partial<EffectSnapshot>): EffectSnapshot {
  return {
    grainIntensity: state.grainIntensity ?? 0,
    gradientOpacity: state.gradientOpacity ?? 0,
    // Copied so a later mutation of the live array cannot rewrite history.
    vignettes: [...(state.vignettes ?? [])],
    blurZones: [...(state.blurZones ?? [])],
    letterboxes: [...(state.letterboxes ?? [])],
    duotoneLight: state.duotoneLight ?? "#FF453A",
    duotoneDark: state.duotoneDark ?? "#0A84FF",
    duotoneIntensity: state.duotoneIntensity ?? 100,
    brightness: state.brightness ?? 0,
    contrast: state.contrast ?? 0,
    saturation: state.saturation ?? 0,
    warmth: state.warmth ?? 0,
    imagePalette: [...(state.imagePalette ?? [])],
  }
}

/** Serialises the canvas without the photo bytes. */
export function dehydrateCanvas(canvas: Canvas): unknown {
  const json = canvas.toObject(DOCUMENT_PROPERTIES as unknown as string[]) as {
    objects?: Array<Record<string, unknown>>
  }

  json.objects?.forEach((object) => {
    if (typeof object.assetId === "string" && object.assetId.length > 0) {
      // The pixels are in IndexedDB under this id; the URL is not worth keeping.
      object.src = ""
      delete object.crossOrigin
    }
  })

  return json
}

/**
 * Puts the photo bytes back.
 *
 * Fabric needs a URL it can load, so the blob is turned into an object URL.
 * Returns the number of images that could not be rehydrated, which means the
 * asset is gone - a cleared browser store, most likely.
 */
export async function hydrateDocument(json: unknown): Promise<number> {
  const document = json as { objects?: Array<Record<string, unknown>> }
  if (!document?.objects) return 0

  releaseIssuedAssetUrls()

  let missing = 0
  for (const object of document.objects) {
    const assetId = object.assetId
    if (typeof assetId !== "string" || assetId.length === 0) continue

    const blob = await getAssetBlob(assetId)
    if (!blob) {
      missing++
      continue
    }
    object.src = URL.createObjectURL(blob)
  }

  return missing
}

/** Loads a dehydrated snapshot, restoring the photos first. */
export async function loadDocument(
  canvas: Canvas,
  json: Record<string, unknown>
): Promise<number> {
  const missing = await hydrateDocument(json)
  await canvas.loadFromJSON(json)
  return missing
}
