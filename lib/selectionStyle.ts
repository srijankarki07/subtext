import type { Canvas } from "fabric"

/**
 * How a selection looks.
 *
 * Fabric's defaults are the 2010s set — mid-grey square handles with a thin
 * border — and they are the loudest thing on the artboard. Everything that
 * touches selection appearance goes through here so the editor has one
 * selection language rather than one per code path: the vignette and the
 * letterbox bars were each setting their own `cornerColor`, which is how a
 * canvas ends up with two different-looking selections.
 */

/** The accent, matching `--primary`. Controls are drawn on the artwork, not on the chrome. */
const ACCENT = "#0075DE"
const HANDLE_FILL = "#FFFFFF"

/**
 * A handle should be the same size on screen whatever the zoom.
 *
 * Control sizes are in *canvas* units, so a fixed 10 shrinks to 6px at 59% and
 * balloons past 30px at 300% — the difference between a handle you can grab and
 * one you cannot. Dividing by the zoom keeps it constant, which is why this
 * takes the zoom at all.
 */
const HANDLE_SCREEN_SIZE = 11
const BORDER_SCREEN_WIDTH = 1.5
const PADDING_SCREEN = 3

/** The minimum canvas-unit size, so a handle stays visible when zoomed far out. */
const MIN_HANDLE = 6

export function selectionStyleFor(zoom: number) {
  const scale = 1 / Math.max(zoom, 0.05)

  return {
    borderColor: ACCENT,
    borderScaleFactor: BORDER_SCREEN_WIDTH,
    // A dashed border would be confused with the blur zone's handle, which is
    // dashed on purpose to say "this is a region, not a layer".
    borderDashArray: null as number[] | null,
    cornerColor: HANDLE_FILL,
    cornerStrokeColor: ACCENT,
    cornerStyle: "circle" as const,
    cornerSize: Math.max(MIN_HANDLE, HANDLE_SCREEN_SIZE * scale),
    transparentCorners: false,
    padding: PADDING_SCREEN * scale,
    // Leaving the interior clear: a tinted selection box over artwork is a
    // colour judgement made through a filter, which is the one thing this app
    // should not ask anyone to do.
    selectionBackgroundColor: "transparent",
  }
}

/**
 * Applies the selection style to everything on the canvas and to the canvas's
 * own drag-selection rectangle.
 *
 * Called rather than set once, because the handle size depends on the zoom and
 * because objects are added throughout a session. Cheap: it is a property write
 * per object, and it runs on zoom changes and additions rather than per frame.
 *
 * The zoom is passed in rather than read from the canvas: this app scales the
 * artboard with CSS so that logical coordinates and export are untouched, which
 * leaves Fabric's own `getZoom()` at 1 forever.
 */
export function applySelectionStyle(canvas: Canvas, zoom: number): void {
  const style = selectionStyleFor(zoom)

  canvas.selectionColor = "rgb(0 117 222 / 12%)"
  canvas.selectionBorderColor = ACCENT

  canvas.getObjects().forEach((object) => {
    if ((object as { editorOnly?: boolean }).editorOnly === true) {
      // Editor chrome keeps its own dashed border — the blur handle says "this
      // is a region, not a layer" with it — but takes the same *handles*, so the
      // affordance for "grab this" looks the same everywhere.
      object.set({
        cornerColor: style.cornerColor,
        cornerStrokeColor: style.cornerStrokeColor,
        cornerStyle: style.cornerStyle,
        cornerSize: style.cornerSize,
        transparentCorners: style.transparentCorners,
      })
      return
    }
    object.set(style)
  })
}

/** The same style, for a single object as it is created. */
export function applySelectionStyleTo(
  object: { set: (values: Record<string, unknown>) => void },
  zoom: number
): void {
  object.set(selectionStyleFor(zoom))
}
