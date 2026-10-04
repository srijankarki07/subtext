import { Rect, type Canvas } from "fabric"

/**
 * Selective blur, and its feathered mode.
 *
 * The blur is a clone of the artwork carrying a Blur filter, with a clip path
 * matching the draggable handle. A clip path is binary, so a "hard" zone has a
 * visible rectangular seam — which is what the vignette's falloff avoids
 * looking like.
 *
 * Feathering is done by stacking further copies of the same blurred clone,
 * each clipped to a progressively *larger* rectangle at partial opacity. Where
 * several overlap the blur accumulates toward opaque, so the visible blur
 * fades out across the rings: fully blurred in the core, then ~87%, ~75%, 50%
 * outward. Compositing identical colours is order-independent, so the layers
 * need no particular stacking order.
 *
 * The alternative — a custom filter multiplying alpha by a gradient — was
 * rejected: `BaseFilter.getFragmentSource()` returns an *identity* shader, so a
 * filter implementing only `applyTo2d` is silently skipped whenever WebGL is
 * active. That would have failed quietly in most browsers.
 */

/** Rings beyond the core. Three gives a legible ramp without piling up clones. */
export const BLUR_FADE_RINGS = 3

/** Alpha per ring. Stacking three of these reaches 0.875 in the innermost ring. */
export const BLUR_RING_ALPHA = 0.5

/** How far the outermost ring reaches, as a fraction of the zone's short side. */
export const BLUR_MAX_SPREAD = 0.25

/**
 * The clip rectangle for one layer of a zone.
 *
 * `ring` 0 is the core, matching the handle exactly; higher rings are expanded
 * outward by `spread` each, so the blur dissolves rather than stopping.
 */
export function blurRingRect(
  handle: { left: number; top: number; getScaledWidth: () => number; getScaledHeight: () => number },
  ring: number,
  feather: number
): { left: number; top: number; width: number; height: number } {
  const width = handle.getScaledWidth()
  const height = handle.getScaledHeight()

  if (ring === 0 || feather <= 0) {
    return { left: handle.left, top: handle.top, width, height }
  }

  const spread =
    (Math.min(width, height) * BLUR_MAX_SPREAD * Math.min(100, feather)) / 100
  const step = (spread * ring) / BLUR_FADE_RINGS

  return {
    left: handle.left - step,
    top: handle.top - step,
    width: width + step * 2,
    height: height + step * 2,
  }
}

/**
 * Recomputes every blur zone's clip paths from its handle.
 *
 * Called when a handle moves or scales, and after any load — `loadFromJSON`
 * replaces every object, which drops the listeners registered at creation time.
 * Both paths share this so a fix in one cannot miss the other.
 */
export function applyBlurClips(canvas: Canvas): void {
  const objects = canvas.getObjects()

  objects.forEach((handle: any) => {
    if (!handle.id?.startsWith("blur-handle")) return

    const overlays: any[] = handle.overlayIds ?? (handle.overlayId ? [handle.overlayId] : [])
    const feather = typeof handle.blurFeather === "number" ? handle.blurFeather : 0

    overlays.forEach((overlayId) => {
      const overlay = objects.find(
        (candidate: any) => candidate.id === overlayId
      ) as any
      if (!overlay) return

      const ring = typeof overlay.blurRing === "number" ? overlay.blurRing : 0
      const rect = blurRingRect(handle, ring, feather)

      overlay.set({
        clipPath: new Rect({ ...rect, absolutePositioned: true }),
      })
    })
  })

  canvas.requestRenderAll()
}
