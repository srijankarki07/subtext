import type { ComponentType } from "react"
import {
  ImagePlus,
  Layers3,
  LayoutTemplate,
  MonitorPlay,
  MousePointer2,
  Type,
} from "lucide-react"

import MediaPanel from "@/components/editor/MediaPanel"
import EffectsPanel from "@/components/panels/EffectPanel"
import LayersPanel from "@/components/panels/LayersPanel"
import TemplatesPanel from "@/components/panels/TemplatesPanel"
import TextBlocksPanel from "@/components/panels/TextBlocksPanel"
import { TOOL_META, type EditorTool } from "@/lib/tools"

/**
 * The React half of the tool registry: what each tool draws.
 *
 * `lib/tools.ts` declares what a tool *is* - its name, its shortcut, whether it
 * has a panel. This binds each id to an icon and a panel component.
 *
 * Both maps are keyed `Record<EditorTool, ...>`, so adding an id to `TOOL_META`
 * fails the build until it is bound here. That is what replaced the six
 * hand-synced lists: the compiler holds the invariant now, and there is no
 * seventh place to forget.
 *
 * No `"use client"` directive: this module has no hooks and renders nothing. It
 * is only ever imported by client components, which is enough.
 */

// `typeof MousePointer2` rather than lucide's `LucideIcon`, which this version
// declares in its types but does not export.
export const TOOL_ICONS: Record<EditorTool, typeof MousePointer2> = {
  select: MousePointer2,
  text: Type,
  media: ImagePlus,
  templates: LayoutTemplate,
  cinema: MonitorPlay,
  layers: Layers3,
}

/**
 * Each tool's panel.
 *
 * The mapped type ties this to `hasPanel` in the metadata: a tool that declares
 * it has no panel must map to `null`, and one that declares a panel must supply
 * a component. Without the tie, "does this tool have a panel" would be written
 * down in two places and could drift.
 *
 * Note that the component is *bound*, never derived from the id - `cinema`
 * opens `EffectPanel`, and the text tool's panel is named for its blocks.
 */
export const TOOL_PANELS: {
  [K in EditorTool]: (typeof TOOL_META)[K]["hasPanel"] extends false
    ? null
    : ComponentType
} = {
  select: null,
  text: TextBlocksPanel,
  media: MediaPanel,
  templates: TemplatesPanel,
  cinema: EffectsPanel,
  layers: LayersPanel,
}
