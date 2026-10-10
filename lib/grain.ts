/**
 * Film grain.
 *
 * Grain used to be an SVG `feTurbulence` overlay in the DOM, which meant it was
 * visible in the editor and absent from every export - `canvas.toDataURL()`
 * never sees DOM siblings. Templates set grain as their primary "film" signal,
 * so most of them exported as something other than what was on screen.
 *
 * Rather than move the texture into the canvas document, grain is generated
 * here once and applied to *both* the preview and the export. Two reasons:
 *
 * 1. A texture inside the document would be serialised as a base64 data URL by
 *    Fabric (patterns store their source that way), so every save and each of
 *    the 30 history snapshots would carry a copy of the noise. That storage
 *    problem is being fixed separately, and this is the wrong place to add to
 *    it.
 * 2. One generator means the preview and the export cannot drift apart - which
 *    is the bug being fixed.
 *
 * The noise is monochrome, unlike `feTurbulence`, which produces coloured
 * speckle across all four channels. Film grain is monochrome.
 *
 * Making grain a first-class, undoable document object still belongs on the
 * list - see the history work.
 */

/** Deterministic PRNG, so the same seed always produces the same grain. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Grain density is defined in *artboard* pixels, not screen pixels, so the
 * same grain is produced at any zoom level and at any export multiplier.
 */
export const GRAIN_TILE_SIZE = 512
export const GRAIN_SEED = 1

/**
 * How far the noise departs from mid-grey, out of 255.
 *
 * `overlay` blending is a no-op at mid-grey, so only the departure is visible;
 * this sets how strong the effect is at intensity 100.
 *
 * Calibrated by measuring the export: at 120 the grain produced a luminance
 * standard deviation of 41 on a flat grey artwork, which is destructive noise
 * rather than grain. This lands near 16 at full intensity and ~10 at 60, which
 * reads as film grain and leaves the artwork legible.
 */
const AMPLITUDE = 28

let cachedTile: HTMLCanvasElement | null = null
let cachedDataUrl: string | null = null

/** A tile of monochrome noise, centred on mid-grey for `overlay` blending. */
export function createGrainTile(
  size: number = GRAIN_TILE_SIZE,
  seed: number = GRAIN_SEED
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas

  const image = ctx.createImageData(size, size)
  const random = mulberry32(seed)

  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.max(
      0,
      Math.min(255, 128 + (random() - 0.5) * 2 * AMPLITUDE)
    )
    image.data[i] = value
    image.data[i + 1] = value
    image.data[i + 2] = value
    image.data[i + 3] = 255
  }

  ctx.putImageData(image, 0, 0)
  return canvas
}

function tile(): HTMLCanvasElement {
  if (!cachedTile) cachedTile = createGrainTile()
  return cachedTile
}

/** The tile as a data URL, for use as a CSS background. */
export function grainTileDataUrl(): string {
  if (!cachedDataUrl) cachedDataUrl = tile().toDataURL("image/png")
  return cachedDataUrl
}

/**
 * Composites grain onto a rendered artwork.
 *
 * `scale` is the export multiplier: at 2× the tile is drawn twice as large, so
 * the grain stays the same size *relative to the artwork* rather than becoming
 * twice as fine - which is how film behaves and what the preview shows.
 *
 * `globalCompositeOperation: "overlay"` is the canvas equivalent of the CSS
 * `mix-blend-mode: overlay` the preview uses, so the two agree.
 */
export function applyGrain(
  target: HTMLCanvasElement,
  intensity: number,
  { scale = 1, seed = GRAIN_SEED }: { scale?: number; seed?: number } = {}
): void {
  if (intensity <= 0) return

  const ctx = target.getContext("2d")
  if (!ctx) return

  const source =
    seed === GRAIN_SEED ? tile() : createGrainTile(GRAIN_TILE_SIZE, seed)
  const pattern = ctx.createPattern(source, "repeat")
  if (!pattern) return

  const tileSize = GRAIN_TILE_SIZE * scale
  const matrix = new DOMMatrix().scale(tileSize / GRAIN_TILE_SIZE)
  pattern.setTransform(matrix)

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, intensity / 100))
  ctx.globalCompositeOperation = "overlay"
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, target.width, target.height)
  ctx.restore()
}

/** CSS for the preview overlay, matching what `applyGrain` draws. */
export function grainPreviewStyle(
  intensity: number,
  zoom: number
): {
  backgroundImage: string
  backgroundSize: string
  mixBlendMode: "overlay"
  opacity: number
} {
  /*
   * No tile without a DOM.
   *
   * The tile is drawn on a canvas, so this cannot be evaluated while rendering
   * on the server - and it *is* called during render by the landing page's grade
   * demo, which server-renders: `document is not defined`, and the page returned
   * a 500. Returning a transparent overlay keeps the call site simple, and the
   * callers render the overlay only after mount anyway, so the server pass never
   * paints it.
   */
  if (typeof document === "undefined") {
    return {
      backgroundImage: "none",
      backgroundSize: "auto",
      mixBlendMode: "overlay",
      opacity: 0,
    }
  }

  return {
    backgroundImage: `url(${grainTileDataUrl()})`,
    // The overlay element is the artboard scaled by `zoom`, so dividing the
    // tile by the zoom keeps grain at one artboard pixel per tile pixel.
    backgroundSize: `${GRAIN_TILE_SIZE * zoom}px ${GRAIN_TILE_SIZE * zoom}px`,
    mixBlendMode: "overlay",
    opacity: Math.max(0, Math.min(1, intensity / 100)),
  }
}
