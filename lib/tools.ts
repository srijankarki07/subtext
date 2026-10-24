/**
 * The editor's tools, as data.
 *
 * This used to be six lists in five files that had to agree by hand: the union
 * and its `TOOLS` array in `ToolRail`, `TOOL_COPY` and the dispatch chain in
 * `ContextPanel`, `TOOL_KEYS` in `EditorShell`, a tuple list in `lib/commands`,
 * and a literal in `Inspector`. Nothing made them agree, and the failure was
 * quiet - a tool could advertise a shortcut in its tooltip that no key handler
 * implemented.
 *
 * Now the union is *derived* from the metadata below, so a tool cannot exist in
 * one list and not another. The React half - each tool's icon and panel
 * component - lives in `components/editor/toolRegistry.tsx`, where the compiler
 * demands an entry for every id declared here.
 *
 * Plain TypeScript on purpose. `lib/` stays importable without React, which is
 * what lets `lib/commands.ts` build the palette from this without reaching into
 * `components/` - the direction the old type import got wrong.
 */

export interface ToolMeta {
  /** The one name: tooltip, the rail's `aria-label`, the panel heading, and ⌘K. */
  label: string
  /** Advertised in the tooltip and the palette, and implemented from this. */
  shortcut: string
  /**
   * Whether the tool opens a context panel.
   *
   * "Select" is a mode rather than a panel, so it never does. The palette reads
   * this too, so it cannot offer to open a panel that does not exist.
   */
  hasPanel: boolean
  /** Extra words the palette matches on, beyond the label. */
  keywords: string
  /** The line under the panel heading. Only meaningful with a panel. */
  hint?: string
}

/**
 * Every tool. The key order here is the rail order - the rail renders
 * `TOOL_ORDER`, which is these keys.
 *
 * Because the union is derived from this object, adding a key adds a tool. Keep
 * anything that is not a tool out of it.
 */
export const TOOL_META = {
  select: {
    label: "Select",
    shortcut: "V",
    hasPanel: false,
    keywords: "pointer move arrange",
  },
  text: {
    label: "Text",
    shortcut: "T",
    hasPanel: true,
    keywords: "type quote author handle signature",
    hint: "Add a considered starting point, then refine it on the artboard.",
  },
  media: {
    label: "Media",
    shortcut: "M",
    hasPanel: true,
    keywords: "photo image upload replace",
    hint: "The photo the words sit on.",
  },
  templates: {
    label: "Templates",
    shortcut: "P",
    hasPanel: true,
    keywords: "preset look layout",
    hint: "A finished design opinion, not a bundle of settings.",
  },
  elements: {
    label: "Elements",
    shortcut: "E",
    hasPanel: true,
    keywords: "shapes lines icons frames stickers",
    hint: "Shapes, lines and icons to build the composition.",
  },
  brand: {
    label: "Brand",
    shortcut: "B",
    hasPanel: true,
    keywords: "logo palette colours fonts kit identity",
    hint: "Colours, fonts and logos you reuse, kept on this device.",
  },
  cinema: {
    label: "Cinema",
    shortcut: "C",
    hasPanel: true,
    keywords: "grade effects blur vignette letterbox duotone grain",
    hint: "Grade the image so the words sit on it comfortably.",
  },
  layers: {
    label: "Layers",
    shortcut: "L",
    hasPanel: true,
    keywords: "order stack lock hide",
    hint: "Reorder, lock and hide what makes up the artwork.",
  },
} as const satisfies Record<string, ToolMeta>

export type EditorTool = keyof typeof TOOL_META

/** Every tool, in rail order. */
export const TOOL_ORDER = Object.keys(TOOL_META) as EditorTool[]

/** The tools that open a panel, in rail order. */
export const PANEL_TOOLS = TOOL_ORDER.filter((id) => TOOL_META[id].hasPanel)

/**
 * The one wording for "open this tool's panel".
 *
 * The palette and the inspector's hand-off both say it, and the verification
 * suites match on the exact string, so it is generated rather than typed twice
 * in two files that could drift.
 */
export function openToolLabel(id: EditorTool): string {
  return `Open the ${TOOL_META[id].label} panel`
}
