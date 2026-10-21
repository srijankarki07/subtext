/**
 * Matte cleanup shared by both removal models.
 *
 * Pure and dependency-free, so the arithmetic can be exercised in Node - the
 * worker and its test use exactly the same code.
 */

/**
 * Trims a soft matte: below `low` it is background, above `high` it is subject.
 *
 * Both models return soft alpha; keeping the middle made the subject fade into
 * the old background instead of ending.
 */
export function smoothAlpha(value: number, low = 0.08, high = 0.85): number {
  if (value <= low) return 0
  if (value >= high) return 1
  return (value - low) / (high - low)
}

/**
 * One-pixel erosion of the alpha channel, in place.
 *
 * MODNet and U-2-Net both leave a thin semi-transparent fringe of the old
 * background around the subject. Taking the minimum alpha in each 3x3
 * neighbourhood removes that edge line; the interior loses one pixel of edge,
 * which is invisible at the model's resolution.
 *
 * `channels` is 4 for RGBA or 1 for a bare mask. Edges are clamped, so a
 * subject that fills the frame is not eroded by the canvas boundary.
 */
export function erodeAlpha(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  channels: 1 | 4
): void {
  const copy = new Uint8ClampedArray(data)
  const alpha = channels - 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let min = 255

      for (let dy = -1; dy <= 1; dy++) {
        const ny = Math.min(height - 1, Math.max(0, y + dy))
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx))
          const value = copy[(ny * width + nx) * channels + alpha]
          if (value < min) min = value
        }
      }

      data[(y * width + x) * channels + alpha] = min
    }
  }
}
