import { TEMPLATES } from "@/lib/templates"
import { useEditorStore } from "@/store/useEditorStore"
import {
  PANEL_TOOLS,
  TOOL_META,
  openToolLabel,
  type EditorTool,
} from "@/lib/tools"

/**
 * Everything the editor can do, as data.
 *
 * One list rather than a set of menus scattered across panels, for two reasons.
 * A command palette is only worth having if it is *complete* - a palette that
 * knows about forty of the editor's sixty actions teaches people not to trust it
 * - and a list in one place is the only way to notice that something is missing.
 *
 * Every entry calls a store action that a control already calls. Nothing here is
 * a new code path; that is deliberate, because a second implementation of an
 * action is a second thing to keep in step.
 */

export interface Command {
  id: string
  title: string
  group: string
  /** The keyboard shortcut, if there is one. Only ever set where one exists. */
  shortcut?: string
  /** Extra words to match on, beyond the title. */
  keywords?: string
  run: () => void
}

export interface CommandHandlers {
  /** Opens a tool's panel. Supplied by the shell, which owns that state. */
  onOpenTool: (tool: EditorTool) => void
  onToggleInspector: () => void
  onToggleTheme: () => void
  onExport: () => void
  onToggleFocusMode: () => void
}

const RATIOS = [
  "1:1 (Square)",
  "9:16 (Reels/Story)",
  "4:5 (Portrait)",
  "16:9 (YouTube)",
]

export function buildCommands(handlers: CommandHandlers): Command[] {
  const store = () => useEditorStore.getState()

  const commands: Command[] = [
    // --- add ---------------------------------------------------------------
    {
      id: "add-quote",
      title: "Add a quote",
      group: "Add",
      keywords: "text type display serif headline",
      run: () => store().addText("quote"),
    },
    {
      id: "add-author",
      title: "Add an author line",
      group: "Add",
      keywords: "text attribution credit",
      run: () => store().addText("author"),
    },
    {
      id: "add-handle",
      title: "Add a social handle",
      group: "Add",
      keywords: "text instagram twitter tag",
      run: () => store().addText("handle"),
    },
    {
      id: "add-signature",
      title: "Add a signature",
      group: "Add",
      keywords: "text script name signed",
      run: () => store().addText("signature"),
    },
    {
      id: "add-image",
      title: "Add a photo",
      group: "Add",
      keywords: "image picture artwork upload",
      run: () => void store().addImage(),
    },

    // --- edit --------------------------------------------------------------
    {
      id: "undo",
      title: "Undo",
      group: "Edit",
      shortcut: "$mod Z",
      run: () => void store().undo(),
    },
    {
      id: "redo",
      title: "Redo",
      group: "Edit",
      shortcut: "$mod ⇧ Z",
      run: () => void store().redo(),
    },
    {
      id: "duplicate",
      title: "Duplicate",
      group: "Edit",
      shortcut: "$mod D",
      keywords: "copy clone",
      run: () => void store().duplicateActiveObject(),
    },
    {
      id: "copy",
      title: "Copy",
      group: "Edit",
      shortcut: "$mod C",
      run: () => void store().copyActiveObject(),
    },
    {
      id: "paste",
      title: "Paste",
      group: "Edit",
      shortcut: "$mod V",
      run: () => void store().pasteClipboardObject(),
    },
    {
      id: "delete",
      title: "Delete the selection",
      group: "Edit",
      shortcut: "⌫",
      keywords: "remove trash",
      run: () => store().deleteActiveObject(),
    },
    {
      id: "deselect",
      title: "Deselect",
      group: "Edit",
      shortcut: "Esc",
      run: () => {
        const { canvas } = store()
        canvas?.discardActiveObject()
        canvas?.requestRenderAll()
        store().setSelection([])
      },
    },
    {
      id: "select-all",
      title: "Select every layer",
      group: "Edit",
      keywords: "all group",
      run: () => {
        const { canvas } = store()
        if (!canvas) return
        store().setSelection(canvas.getObjects())
      },
    },

    // --- arrange -----------------------------------------------------------
    {
      id: "bring-forward",
      title: "Bring forward",
      group: "Arrange",
      shortcut: "$mod ]",
      keywords: "layer order up",
      run: () => store().bringForward(),
    },
    {
      id: "bring-to-front",
      title: "Bring to front",
      group: "Arrange",
      shortcut: "$mod ⌥ ]",
      keywords: "layer order top",
      run: () => store().bringToFront(),
    },
    {
      id: "send-backward",
      title: "Send backward",
      group: "Arrange",
      shortcut: "$mod [",
      keywords: "layer order down",
      run: () => store().sendBackward(),
    },
    {
      id: "send-to-back",
      title: "Send to back",
      group: "Arrange",
      shortcut: "$mod ⌥ [",
      keywords: "layer order bottom",
      run: () => store().sendToBack(),
    },

    // --- canvas ------------------------------------------------------------
    ...RATIOS.map((ratio) => {
      const preset = {
        "1:1 (Square)": [1080, 1080],
        "9:16 (Reels/Story)": [1080, 1920],
        "4:5 (Portrait)": [1080, 1350],
        "16:9 (YouTube)": [1920, 1080],
      }[ratio]!
      return {
        id: `ratio-${ratio}`,
        title: `Canvas: ${ratio}`,
        group: "Canvas",
        keywords: "size aspect ratio resize",
        run: () => store().setAspectRatio(preset[0], preset[1]),
      }
    }),

    // --- guides ------------------------------------------------------------
    {
      id: "guide-thirds",
      title: "Toggle the thirds grid",
      group: "Guides",
      keywords: "composition rule of thirds overlay",
      run: () => store().toggleGuide("thirds"),
    },
    {
      id: "guide-centre",
      title: "Toggle centre lines",
      group: "Guides",
      keywords: "composition middle overlay",
      run: () => store().toggleGuide("centre"),
    },
    {
      id: "guide-safe",
      title: "Toggle the safe area",
      group: "Guides",
      keywords: "composition margin overlay",
      run: () => store().toggleGuide("safeArea"),
    },

    // --- view --------------------------------------------------------------
    {
      id: "zoom-in",
      title: "Zoom in",
      group: "View",
      shortcut: "$mod +",
      run: () => store().zoomBy(1.2),
    },
    {
      id: "zoom-out",
      title: "Zoom out",
      group: "View",
      shortcut: "$mod −",
      run: () => store().zoomBy(1 / 1.2),
    },
    {
      id: "zoom-fit",
      title: "Fit the artboard",
      group: "View",
      shortcut: "$mod 0",
      run: () => store().fitToViewport(),
    },
    {
      id: "toggle-inspector",
      title: "Toggle the inspector",
      group: "View",
      keywords: "panel properties hide show",
      run: () => handlers.onToggleInspector(),
    },
    {
      id: "toggle-focus",
      title: "Focus mode",
      group: "View",
      keywords: "distraction free fullscreen hide panels zen",
      run: () => handlers.onToggleFocusMode(),
    },
    {
      id: "toggle-compare",
      title: "Compare with the original photo",
      group: "View",
      keywords: "before after split grade original",
      run: () => store().setComparing(!store().isComparing),
    },
    {
      id: "toggle-theme",
      title: "Toggle the light and dark theme",
      group: "View",
      keywords: "appearance colour scheme dark light",
      run: () => handlers.onToggleTheme(),
    },
    // One entry per tool that has a panel, from the same metadata the rail
    // renders. This used to be a second, hand-written list of the tools - and
    // omitting "select" from it was a third place the same fact was recorded.
    ...PANEL_TOOLS.map((tool) => ({
      id: `panel-${tool}`,
      title: openToolLabel(tool),
      group: "View",
      shortcut: TOOL_META[tool].shortcut,
      keywords: `tool panel show ${TOOL_META[tool].keywords}`,
      run: () => handlers.onOpenTool(tool),
    })),

    // --- effects -----------------------------------------------------------
    {
      id: "add-vignette",
      title: "Add a vignette",
      group: "Effects",
      keywords: "darken edges cinema",
      run: () => store().addVignette(),
    },
    {
      id: "add-letterbox",
      title: "Add letterbox bars",
      group: "Effects",
      keywords: "widescreen crop cinema bars",
      run: () => store().addLetterbox(15),
    },
    {
      id: "add-blur-zone",
      title: "Add a selective blur box",
      group: "Effects",
      keywords: "blur readability behind text",
      run: () => void store().addBlurZone(),
    },
    {
      id: "grain-on",
      title: "Film grain: on",
      group: "Effects",
      keywords: "texture noise film",
      run: () => store().setGrainIntensity(30),
    },
    {
      id: "grain-off",
      title: "Film grain: off",
      group: "Effects",
      keywords: "texture noise film remove",
      run: () => store().setGrainIntensity(0),
    },
    {
      id: "reset-atmospherics",
      title: "Reset the atmosphere and texture",
      group: "Effects",
      keywords: "clear vignette grain gradient",
      run: () => store().resetEffect("atmospherics"),
    },
    {
      id: "reset-adjustments",
      title: "Reset the colour adjustments",
      group: "Effects",
      keywords: "clear brightness contrast saturation warmth",
      run: () => store().resetEffect("adjustments"),
    },
    {
      id: "reset-all-effects",
      title: "Reset every effect",
      group: "Effects",
      keywords: "clear all remove",
      run: () => store().resetEffect("all"),
    },

    // --- document ----------------------------------------------------------
    {
      id: "save",
      title: "Save a copy I can restore",
      group: "Document",
      shortcut: "$mod S",
      keywords: "persist download store",
      run: () => void store().saveProjectToStorage(),
    },
    {
      id: "restore",
      title: "Restore my saved copy",
      group: "Document",
      keywords: "load reopen persist",
      run: () => void store().loadProjectFromStorage("savedProject"),
    },
    {
      id: "new-canvas",
      title: "Start a new canvas",
      group: "Document",
      keywords: "clear reset blank",
      run: () => store().clearCanvas(),
    },
    {
      id: "export",
      title: "Export…",
      group: "Document",
      keywords: "download png jpg save image",
      run: () => handlers.onExport(),
    },
  ]

  // The templates, so the palette can apply one without opening the panel.
  TEMPLATES.forEach((template) => {
    commands.push({
      id: `template-${template.id}`,
      title: `Apply the ${template.name} template`,
      group: "Templates",
      keywords: `${template.category} look style`,
      run: () => store().applyTemplate(template.id),
    })
  })

  return commands
}

/**
 * Replaces `$mod` with the platform's modifier.
 *
 * Shown in the palette and read from the same place the shortcuts are declared,
 * so a hint can only be wrong if the shortcut itself is.
 */
export function formatShortcut(shortcut: string, isMac: boolean): string {
  return shortcut.replace("$mod", isMac ? "⌘" : "Ctrl")
}

/** Filters and ranks. Substring rather than fuzzy: predictable beats clever. */
export function searchCommands(commands: Command[], query: string): Command[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return commands

  const scored = commands
    .map((command) => {
      const title = command.title.toLowerCase()
      const haystack = `${title} ${command.group.toLowerCase()} ${command.keywords ?? ""}`
      if (!terms.every((term) => haystack.includes(term))) return null

      // A title that starts with the query is almost always what was meant.
      const startsWith = terms.every((term) => title.startsWith(term))
      return { command, score: startsWith ? 0 : title.length }
    })
    .filter(
      (entry): entry is { command: Command; score: number } => entry !== null
    )

  return scored.sort((a, b) => a.score - b.score).map((entry) => entry.command)
}
