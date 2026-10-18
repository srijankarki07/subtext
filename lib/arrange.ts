/**
 * Aligning and distributing a selection.
 *
 * Pure geometry - boxes in, movement deltas out. That split is deliberate: the
 * arithmetic is the part that can be wrong by a pixel and still look plausible,
 * so it belongs somewhere it can be exercised in Node without a canvas, and the
 * store action stays a thin adapter over Fabric.
 *
 * A result is always a *delta*, never a position. Moving by `dx`/`dy` keeps
 * origin and rotation out of the maths: a bounding box is axis-aligned and
 * absolute, and adding a delta to `left`/`top` moves the object correctly
 * whatever its origin happens to be.
 */

export interface ArrangeBox {
  left: number
  top: number
  width: number
  height: number
}

export type AlignMode =
  "left" | "center-h" | "right" | "top" | "center-v" | "bottom"

export type DistributeAxis = "horizontal" | "vertical"

export interface Move {
  dx: number
  dy: number
}

const NONE: Move = { dx: 0, dy: 0 }

/**
 * Moves every box onto one edge or centre line of the selection's own bounds.
 *
 * The bounds are the union of the boxes, not the artboard: "align left" means
 * align with the leftmost thing you have selected, which is what every editor
 * means by it.
 */
export function alignBoxes(boxes: ArrangeBox[], mode: AlignMode): Move[] {
  if (boxes.length < 2) return boxes.map(() => ({ ...NONE }))

  const left = Math.min(...boxes.map((box) => box.left))
  const right = Math.max(...boxes.map((box) => box.left + box.width))
  const top = Math.min(...boxes.map((box) => box.top))
  const bottom = Math.max(...boxes.map((box) => box.top + box.height))

  return boxes.map((box) => {
    switch (mode) {
      case "left":
        return { dx: left - box.left, dy: 0 }
      case "center-h":
        return { dx: (left + right) / 2 - (box.left + box.width / 2), dy: 0 }
      case "right":
        return { dx: right - (box.left + box.width), dy: 0 }
      case "top":
        return { dx: 0, dy: top - box.top }
      case "center-v":
        return { dx: 0, dy: (top + bottom) / 2 - (box.top + box.height / 2) }
      case "bottom":
        return { dx: 0, dy: bottom - (box.top + box.height) }
    }
  })
}

/**
 * Spaces the boxes evenly between the outermost two, which do not move.
 *
 * Equal *gaps*, not equal centres: objects of different sizes spaced by centre
 * look uneven, and this is what "distribute" means in every editor that has it.
 * The first and last boxes stay exactly where they are, so distributing never
 * shifts the composition as a whole.
 *
 * Fewer than three boxes have nothing to distribute - with two, the pair already
 * defines the span and any spacing would move one of them.
 */
export function distributeBoxes(
  boxes: ArrangeBox[],
  axis: DistributeAxis
): Move[] {
  const moves = boxes.map(() => ({ ...NONE }))
  if (boxes.length < 3) return moves

  const horizontal = axis === "horizontal"
  const start = (box: ArrangeBox) => (horizontal ? box.left : box.top)
  const size = (box: ArrangeBox) => (horizontal ? box.width : box.height)

  // Visual order, which is what "evenly spaced" is judged against - not the
  // order the layers happen to be selected in.
  const order = boxes
    .map((_, index) => index)
    .sort((a, b) => start(boxes[a]) - start(boxes[b]))

  const first = boxes[order[0]]
  const last = boxes[order[order.length - 1]]
  const span = start(last) + size(last) - start(first)
  const total = boxes.reduce((sum, box) => sum + size(box), 0)
  const gap = (span - total) / (boxes.length - 1)

  let cursor = start(first)
  for (const index of order) {
    const box = boxes[index]
    const delta = cursor - start(box)
    moves[index] = horizontal ? { dx: delta, dy: 0 } : { dx: 0, dy: delta }
    cursor += size(box) + gap
  }

  return moves
}
