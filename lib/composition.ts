/**
 * Composition guides, and the snapping that makes them more than decoration.
 *
 * A drawn grid is easy to ignore. The useful half is the solver: while something
 * is being dragged, its edges and its centres are compared against the guides
 * and the other layers, and a position within a few pixels of a guide is pulled
 * onto it. That is what turns "put the quote roughly in the middle" into "the
 * quote is centred".
 *
 * All of it is pure - plain numbers in, plain numbers out - so the arithmetic
 * can be exercised in Node. That matters here more than usual: a snapping bug is
 * a one-pixel lie that looks plausible on screen.
 */

/**
 * The transform fields Fabric gives us. Deliberately structural rather than
 * `FabricObject`, so this can be called from a test with an object literal.
 */
export interface BoxLike {
  left: number
  top: number
  width: number
  height: number
  scaleX?: number
  scaleY?: number
  originX?: string
  originY?: string
}

export interface AxisAlignedBox {
  left: number
  top: number
  right: number
  bottom: number
  centreX: number
  centreY: number
  width: number
  height: number
}

/**
 * The object's unrotated bounding box in canvas coordinates.
 *
 * Rotation is ignored on purpose. Fabric objects here default to a centre
 * origin, and the ones that do not (the artboard-filling effect rects) are set
 * to a top-left origin explicitly - so the origin has to be honoured rather
 * than assumed. Snapping a rotated object by its unrotated box is a known
 * approximation: it is right at 0°, 90°, 180° and 270°, and off by at most the
 * difference in between. Every composition in this app is built unrotated.
 */
export function boxOf(object: BoxLike): AxisAlignedBox {
  const width = Math.abs(object.width * (object.scaleX ?? 1))
  const height = Math.abs(object.height * (object.scaleY ?? 1))

  // Fabric's `originX` is one of left/center/right; anything unrecognised (or
  // absent) behaves as centre, which is Fabric's own default.
  const originX =
    object.originX === "left" ? 0 : object.originX === "right" ? 1 : 0.5
  const originY =
    object.originY === "top" ? 0 : object.originY === "bottom" ? 1 : 0.5

  const left = object.left - width * originX
  const top = object.top - height * originY

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    centreX: left + width / 2,
    centreY: top + height / 2,
    width,
    height,
  }
}

/** Boxes that do not participate in snapping: editor-only chrome. */
export interface SnapCandidate {
  box: AxisAlignedBox
  /** Ids are only used to let a caller skip comparing an object with itself. */
  id?: string
}

export type GuideAxis = "x" | "y"

export type GuideKind =
  /** The artboard's own edges. */
  | "edge"
  /** The artboard's centre lines. */
  | "centre"
  /** The rule-of-thirds lines. */
  | "third"
  /** Another layer's edge or centre. */
  | "layer"

export interface Guide {
  axis: GuideAxis
  /** Canvas coordinate of the line. */
  position: number
  kind: GuideKind
}

/**
 * Margin of the safe area, as a fraction of the frame.
 *
 * Broadcast uses 5% for title-safe - the region a title can sit in without
 * being cropped by a screen's overscan. For a quote poster the same margin is
 * the one that keeps text clear of the UI a social app draws over the edges, so
 * the standard number is the honest one to use rather than an invented one.
 */
export const SAFE_AREA_MARGIN = 0.05

export interface GuideOptions {
  thirds: boolean
  centre: boolean
  edges: boolean
}

/**
 * The guides the artboard itself contributes: its edges and centre lines, and
 * the third lines.
 *
 * These are always offered to the solver - snapping to the artboard's centre
 * should work whether or not the grid is on screen, because the grid is a
 * display preference and the geometry is not. `GuideOptions` decides only what
 * gets *drawn*.
 */
export function artboardGuides(width: number, height: number): Guide[] {
  return [
    { axis: "x", position: 0, kind: "edge" },
    { axis: "x", position: width, kind: "edge" },
    { axis: "x", position: width / 2, kind: "centre" },
    { axis: "x", position: width / 3, kind: "third" },
    { axis: "x", position: (width * 2) / 3, kind: "third" },
    { axis: "y", position: 0, kind: "edge" },
    { axis: "y", position: height, kind: "edge" },
    { axis: "y", position: height / 2, kind: "centre" },
    { axis: "y", position: height / 3, kind: "third" },
    { axis: "y", position: (height * 2) / 3, kind: "third" },
  ]
}

/** Every edge and centre line of a layer, as snap targets. */
export function layerGuides(box: AxisAlignedBox): Guide[] {
  return [
    { axis: "x", position: box.left, kind: "layer" },
    { axis: "x", position: box.centreX, kind: "layer" },
    { axis: "x", position: box.right, kind: "layer" },
    { axis: "y", position: box.top, kind: "layer" },
    { axis: "y", position: box.centreY, kind: "layer" },
    { axis: "y", position: box.bottom, kind: "layer" },
  ]
}

/** The safe-area rectangle, inset by {@link SAFE_AREA_MARGIN} on every side. */
export function safeArea(
  width: number,
  height: number
): { left: number; top: number; width: number; height: number } {
  const insetX = width * SAFE_AREA_MARGIN
  const insetY = height * SAFE_AREA_MARGIN
  return {
    left: insetX,
    top: insetY,
    width: width - insetX * 2,
    height: height - insetY * 2,
  }
}

/**
 * A guide that fired, with the stretch of itself worth drawing.
 *
 * A snapped line is drawn across the object that snapped plus a little margin,
 * which is how it reads as belonging to that object: a guide running the full
 * width of the frame would be drawn over the artboard's own edge and look like
 * a border.
 */
export interface SnapLine extends Guide {
  from: number
  to: number
}

export interface SnapOutcome {
  /** How far to move the object. Zero on an axis with no match. */
  dx: number
  dy: number
  /** The guides that fired, for drawing. Empty when nothing snapped. */
  guides: SnapLine[]
}

const NO_SNAP: SnapOutcome = { dx: 0, dy: 0, guides: [] }

/**
 * The offset that pulls `box` onto the nearest guide, per axis.
 *
 * All three of the box's own lines compete - its two edges and its centre - and
 * the *closest* match wins, so a small object near a guide snaps by its edge
 * while a centred one snaps by its centre. Within one axis only one line may
 * win; ties go to whichever the loop reaches first, which is the box's leading
 * edge, and that is stable.
 *
 * `threshold` is in canvas units. The caller converts from screen pixels with
 * the zoom factor, so the pull feels the same however far in the view is.
 */
export function solveSnap(
  box: AxisAlignedBox,
  guides: Guide[],
  threshold: number
): SnapOutcome {
  if (threshold <= 0 || guides.length === 0) return NO_SNAP

  const axis = (which: GuideAxis, moving: number[]) => {
    let bestDelta = 0
    let bestDistance = threshold + 1
    let bestPosition: number | null = null

    for (const position of moving) {
      for (const guide of guides) {
        if (guide.axis !== which) continue
        const delta = guide.position - position
        const distance = Math.abs(delta)
        // `-1e-9` so an exact tie keeps the earlier candidate rather than
        // flipping between two equally good guides from one pointer event to
        // the next.
        if (distance <= threshold && distance < bestDistance - 1e-9) {
          bestDistance = distance
          bestDelta = delta
          bestPosition = guide.position
        }
      }
    }

    return { delta: bestDelta, position: bestPosition }
  }

  const x = axis("x", [box.left, box.centreX, box.right])
  const y = axis("y", [box.top, box.centreY, box.bottom])

  if (x.position === null && y.position === null) return NO_SNAP

  // The moved box, so the drawn guides span the object rather than the whole
  // artboard - a guide line that runs the full width of the frame would be
  // drawn over the artboard's own edge and read as a border.
  const moved: AxisAlignedBox = {
    ...box,
    left: box.left + x.delta,
    right: box.right + x.delta,
    centreX: box.centreX + x.delta,
    top: box.top + y.delta,
    bottom: box.bottom + y.delta,
    centreY: box.centreY + y.delta,
  }

  const fired: SnapLine[] = []
  // Every guide sharing the winning position is drawn, not just the first: a
  // layer's edge and the artboard's centre can sit at the same coordinate, and
  // both are true at once.
  const collect = (which: GuideAxis, position: number) => {
    const span = extentOf(moved, which === "x" ? "y" : "x", GUIDE_OVERHANG)
    guides
      .filter((g) => g.axis === which && g.position === position)
      .forEach((g) => fired.push({ ...g, from: span.from, to: span.to }))
  }

  if (x.position !== null) collect("x", x.position)
  if (y.position !== null) collect("y", y.position)

  return { dx: x.delta, dy: y.delta, guides: fired }
}

/** How far a snapped guide line overhangs the object that snapped, in canvas units. */
export const GUIDE_OVERHANG = 24

/** The range of a box along one axis, optionally grown by a padding. */
export function extentOf(
  box: AxisAlignedBox,
  which: GuideAxis,
  padding = 0
): { from: number; to: number } {
  return which === "x"
    ? { from: box.left - padding, to: box.right + padding }
    : { from: box.top - padding, to: box.bottom + padding }
}

/**
 * Converts a screen-pixel threshold into canvas units.
 *
 * A fixed canvas-unit threshold would feel loose when zoomed out and
 * unusably tight when zoomed in - the whole point is that the pull is a
 * constant *screen* distance.
 */
export function snapThreshold(zoom: number, screenPixels = 6): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return screenPixels
  return screenPixels / zoom
}
