/**
 * The Elements library: shapes, lines, frames and icons.
 *
 * Every element is a small SVG node list in a 24x24 view box. That one
 * representation is used twice - the panel renders it as a preview, and the
 * store turns it into real Fabric objects on insert - so a preview can never
 * show something different from what lands on the artboard.
 *
 * The icons are generated from `lucide-react` (ISC); see
 * `lib/element-icons.generated.ts`. The rest are hand-authored geometry, which
 * is why they carry no third-party licence.
 *
 * Plain TypeScript on purpose: `lib/selection.ts` reads element names from here
 * to label a layer, and the geometry can be exercised without a browser.
 */

import { ICON_NODES } from "@/lib/element-icons.generated"

export type SvgNode = [tag: string, attrs: Record<string, string | number>]

/** Filled shapes paint their interior; everything else paints its stroke. */
export type ElementPaint = "fill" | "stroke"

export type ElementCategory = "Shapes" | "Lines" | "Frames" | "Icons"

export interface ElementDef {
  id: string
  name: string
  category: ElementCategory
  /** Extra words the panel's search matches, beyond the name. */
  keywords: string
  paint: ElementPaint
  nodes: SvgNode[]
}

export const ELEMENT_CATEGORIES: ElementCategory[] = [
  "Shapes",
  "Lines",
  "Frames",
  "Icons",
]

// --- node helpers ----------------------------------------------------------

const path = (d: string): SvgNode => ["path", { d }]
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 0
): SvgNode => ["rect", { x, y, width, height, rx }]
const circle = (cx: number, cy: number, r: number): SvgNode => [
  "circle",
  { cx, cy, r },
]
const line = (x1: number, y1: number, x2: number, y2: number): SvgNode => [
  "line",
  { x1, y1, x2, y2 },
]

// --- shapes ----------------------------------------------------------------

const SHAPES: ElementDef[] = [
  {
    id: "square",
    name: "Square",
    category: "Shapes",
    keywords: "box rectangle block",
    paint: "fill",
    nodes: [rect(3, 3, 18, 18)],
  },
  {
    id: "rounded-square",
    name: "Rounded square",
    category: "Shapes",
    keywords: "box rectangle card",
    paint: "fill",
    nodes: [rect(3, 3, 18, 18, 5)],
  },
  {
    id: "circle",
    name: "Circle",
    category: "Shapes",
    keywords: "round dot ellipse",
    paint: "fill",
    nodes: [circle(12, 12, 9)],
  },
  {
    id: "triangle",
    name: "Triangle",
    category: "Shapes",
    keywords: "arrow wedge",
    paint: "fill",
    nodes: [path("M12 3.5 21 20.5H3z")],
  },
  {
    id: "diamond",
    name: "Diamond",
    category: "Shapes",
    keywords: "rhombus rotated square",
    paint: "fill",
    nodes: [path("M12 2.8 21.2 12 12 21.2 2.8 12z")],
  },
  {
    id: "hexagon",
    name: "Hexagon",
    category: "Shapes",
    keywords: "polygon six",
    paint: "fill",
    nodes: [path("M7.5 4h9L21 12l-4.5 8h-9L3 12z")],
  },
  {
    id: "star",
    name: "Star",
    category: "Shapes",
    keywords: "rating favourite",
    paint: "fill",
    nodes: [
      path(
        "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z"
      ),
    ],
  },
  {
    id: "heart",
    name: "Heart",
    category: "Shapes",
    keywords: "love like favourite",
    paint: "fill",
    nodes: [
      path(
        "M12 21s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.2 5.2 5.2 0 0 1 21.3 12c-1.8 4.4-9.3 9-9.3 9z"
      ),
    ],
  },
  {
    id: "speech",
    name: "Speech bubble",
    category: "Shapes",
    keywords: "quote caption callout",
    paint: "fill",
    nodes: [path("M4 5h16v11H9l-5 4z")],
  },
  {
    id: "blob",
    name: "Blob",
    category: "Shapes",
    keywords: "organic shape splash",
    paint: "fill",
    nodes: [
      path(
        "M12 3c4 0 8 2.4 8 6.8 0 4.6-4.2 8.4-8 11.2-3.8-2.8-8-6.6-8-11.2C4 5.4 8 3 12 3z"
      ),
    ],
  },
]

// --- lines -----------------------------------------------------------------

const LINES: ElementDef[] = [
  {
    id: "divider",
    name: "Divider",
    category: "Lines",
    keywords: "rule line separator",
    paint: "stroke",
    nodes: [line(3, 12, 21, 12)],
  },
  {
    id: "divider-dotted",
    name: "Dotted divider",
    category: "Lines",
    keywords: "dash rule separator",
    paint: "stroke",
    nodes: [
      ["line", { x1: 3, y1: 12, x2: 21, y2: 12, "stroke-dasharray": "2 3" }],
    ],
  },
  {
    id: "divider-thick",
    name: "Bar",
    category: "Lines",
    keywords: "thick rule block",
    paint: "fill",
    nodes: [rect(3, 10, 18, 4, 2)],
  },
  {
    id: "arrow",
    name: "Arrow",
    category: "Lines",
    keywords: "direction pointer right",
    paint: "stroke",
    nodes: [path("M3 12h17M14 6l6 6-6 6")],
  },
  {
    id: "diagonal",
    name: "Diagonal",
    category: "Lines",
    keywords: "slash angle",
    paint: "stroke",
    nodes: [line(4, 20, 20, 4)],
  },
  {
    id: "wave",
    name: "Wave",
    category: "Lines",
    keywords: "curve squiggle flow",
    paint: "stroke",
    nodes: [path("M2.5 15c3-6 6-6 9 0s6 6 9 0")],
  },
]

// --- frames ----------------------------------------------------------------

const FRAMES: ElementDef[] = [
  {
    id: "frame",
    name: "Rectangle frame",
    category: "Frames",
    keywords: "outline border box",
    paint: "stroke",
    nodes: [rect(3, 4, 18, 16, 2)],
  },
  {
    id: "frame-circle",
    name: "Circle frame",
    category: "Frames",
    keywords: "outline ring border",
    paint: "stroke",
    nodes: [circle(12, 12, 9)],
  },
  {
    id: "frame-corners",
    name: "Corners",
    category: "Frames",
    keywords: "crop brackets border",
    paint: "stroke",
    nodes: [path("M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6")],
  },
  {
    id: "frame-arch",
    name: "Arch",
    category: "Frames",
    keywords: "window door rounded border",
    paint: "stroke",
    nodes: [path("M4 21V12a8 8 0 0 1 16 0v9")],
  },
]

// --- icons -----------------------------------------------------------------

const ICON_NAMES: Array<[key: string, name: string]> = [
  ["star", "Star outline"],
  ["heart", "Heart outline"],
  ["sparkles", "Sparkles"],
  ["sun", "Sun"],
  ["moon", "Moon"],
  ["cloud", "Cloud"],
  ["zap", "Bolt"],
  ["music", "Music"],
  ["camera", "Camera"],
  ["map-pin", "Location"],
  ["coffee", "Coffee"],
  ["crown", "Crown"],
]

const ICONS: ElementDef[] = ICON_NAMES.map(([key, name]) => ({
  id: `icon-${key}`,
  name,
  category: "Icons",
  keywords: `icon symbol ${key.replace("-", " ")}`,
  paint: "stroke",
  nodes: ICON_NODES[key] ?? [],
}))

export const ELEMENTS: ElementDef[] = [...SHAPES, ...LINES, ...FRAMES, ...ICONS]

export function elementById(id: string): ElementDef | undefined {
  return ELEMENTS.find((element) => element.id === id)
}

const OBJECT_ID_PREFIX = "element-"

/** The catalogue id carried by an inserted object, if it is one. */
export function elementIdFromObjectId(objectId: string): string | undefined {
  return objectId.startsWith(OBJECT_ID_PREFIX)
    ? objectId.slice(OBJECT_ID_PREFIX.length)
    : undefined
}

/** Search over name, category and keywords. Every term must match. */
export function filterElements(query: string): ElementDef[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return ELEMENTS

  return ELEMENTS.filter((element) => {
    const haystack =
      `${element.name} ${element.category} ${element.keywords}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}

/**
 * The element as an SVG document.
 *
 * Built at 24x24 and scaled by the store, rather than baked to the target size,
 * so the stroke can be normalised after scaling - otherwise a 2-unit line in a
 * 24-unit box becomes a slab once the icon is 190px wide.
 */
export function elementSvg(def: ElementDef, colour: string): string {
  const paint =
    def.paint === "fill"
      ? `fill="${colour}" stroke="none"`
      : `fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`

  const body = def.nodes
    .map(([tag, attrs]) => {
      const values = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ")
      return `<${tag} ${values} ${paint} />`
    })
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body}</svg>`
}
