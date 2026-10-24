"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Download,
  LayoutGrid,
  PenLine,
  Redo2,
  Settings2,
  SlidersHorizontal,
  Undo2,
  X,
} from "lucide-react"

import CanvasWorkspace from "@/components/editor/CanvasWorkspace"
import ContextPanel from "@/components/editor/ContextPanel"
import { useTheme } from "@/components/theme-provider"

import Autosave from "@/components/editor/Autosave"
import CommandPalette from "@/components/editor/CommandPalette"
import FocusBar from "@/components/editor/FocusBar"
import Inspector, { InspectorPanelContent } from "@/components/editor/Inspector"
import RestoredNotice from "@/components/editor/RestoredNotice"
import TopBar from "@/components/editor/TopBar"
import ToolRail from "@/components/editor/ToolRail"
import ContextMenu from "@/components/editor/contextMenu"
import DesignsModal from "@/components/modals/DesignsModal"
import ExportModal from "@/components/modals/ExportModal"
import GlobalDialogs from "@/components/modals/GlobalDialogs"
import { TOOL_ICONS, TOOL_PANELS } from "@/components/editor/toolRegistry"
import { Button } from "@/components/ui/button"
import { useEditorStore } from "@/store/useEditorStore"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TOOL_META, TOOL_ORDER, type EditorTool } from "@/lib/tools"
import { cn } from "@/lib/utils"

/**
 * The editor shell.
 *
 * Regions, largest first: the artboard workspace, then the tool rail, the
 * context panel, and the contextual inspector. The workspace is the only dark
 * surface - everything around it is paper and white card, so the artwork stays
 * the hero (design doc §2).
 */

/**
 * One destination in the mobile strip.
 *
 * The strip is built from the same registry as the desktop rail, so every tool
 * that exists on a desktop exists on a phone. Two of these are not tools -
 * "Edit" opens the selection inspector - and they are the only hand-written
 * entries left on this surface.
 */
function MobileStripButton({
  label,
  icon,
  active,
  onClick,
  fixedWidth = 58,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  fixedWidth?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      style={{ width: fixedWidth }}
      className={cn(
        "relative flex h-full shrink-0 cursor-pointer flex-col items-center justify-center gap-1 text-[10px] transition-colors outline-none",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        active
          ? "font-medium text-primary"
          : "text-[var(--text-muted)] active:text-foreground"
      )}
    >
      {active && (
        <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
      )}
      {icon}
      <span className="max-w-full truncate px-0.5">{label}</span>
    </button>
  )
}

/**
 * The tool shortcuts, derived from the registry.
 *
 * Written by hand, this map and the shortcuts the rail advertises in its
 * tooltips could disagree, and the failure was silent: the tooltip promised a
 * key that nothing handled. Deriving it from the same metadata the tooltip
 * reads makes that impossible.
 */
const TOOL_KEYS: Record<string, EditorTool> = Object.fromEntries(
  TOOL_ORDER.map((id) => [TOOL_META[id].shortcut.toLowerCase(), id])
)

export default function EditorShell() {
  const activeObject = useEditorStore((s) => s.activeObject)
  const activeMobileTab = useEditorStore((s) => s.activeMobileTab)
  const setActiveMobileTab = useEditorStore((s) => s.setActiveMobileTab)
  const setIsExportModalOpen = useEditorStore((s) => s.setIsExportModalOpen)
  const openDesigns = useEditorStore((s) => s.openDesigns)
  const editActiveText = useEditorStore((s) => s.editActiveText)
  const initializeDesigns = useEditorStore((s) => s.initializeDesigns)
  const initializeCustomFonts = useEditorStore((s) => s.initializeCustomFonts)
  const canvas = useEditorStore((s) => s.canvas)
  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const hasRestored = useRef(false)
  const [activeTool, setActiveTool] = useState<EditorTool>("text")
  /**
   * Whether the context panel is showing.
   *
   * Kept separate from `activeTool` on purpose. The panel used to be hidden by
   * switching the active tool to "select", which conflated "which panel" with
   * "is a panel showing" - so collapsing the panel also dropped the tool
   * selection, and the rail highlighted a tool the user had not chosen.
   */
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [userToggledInspector, setUserToggledInspector] = useState(false)

  // Auto-open the inspector on the first selection, but never fight the user
  // after they have closed it deliberately.
  useEffect(() => {
    if (activeObject && !isInspectorOpen && !userToggledInspector) {
      setIsInspectorOpen(true)
    }
  }, [activeObject, isInspectorOpen, userToggledInspector])

  useEffect(() => {
    void initializeDesigns()
  }, [initializeDesigns])

  /**
   * Brings the stored document back, once, when the canvas exists.
   *
   * This is a single-document editor, so the alternative - opening empty every
   * time while the previous document sits in storage - is the worse failure: it
   * looks like the work is gone. The notice below is what makes it legible
   * rather than mysterious.
   *
   * `canvas` is the dependency, not a mount flag: the Fabric canvas is built by
   * the Canvas component, and restoring before it exists silently does nothing.
   */
  useEffect(() => {
    if (!canvas) return
    // Once per mount, and the ref is not decoration: development builds run
    // effects twice, and the second restore set the "already announced" flag on
    // its first pass and then cleared `restoredAt` on its second - so the notice
    // never appeared in dev while working in production. A ref survives the
    // double invocation; state would not.
    if (hasRestored.current) return
    hasRestored.current = true
    // No-op when nothing is stored, so a fresh session opens empty.
    void useEditorStore.getState().loadProjectFromStorage()
  }, [canvas])

  useEffect(() => {
    void initializeCustomFonts()
  }, [initializeCustomFonts])

  /**
   * The palette's shortcut.
   *
   * Registered here rather than in the palette itself so it works whether or not
   * the palette is mounted, and deliberately above the canvas's own key handler
   * in precedence: ⌘K is not a canvas action, and a text layer being edited
   * should not swallow it.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return
      if (!(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setIsPaletteOpen((open) => !open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleToggleInspector = () => {
    setIsInspectorOpen((open) => !open)
    setUserToggledInspector(true)
  }

  /**
   * Opens a tool's panel, unconditionally.
   *
   * `handleToolChange` is a *toggle* - picking the active tool collapses the
   * panel - which is right for the rail and wrong for a hand-off from the
   * inspector: "Open the Cinema panel" while Cinema was already the active tool
   * closed the very panel it promised to open.
   */
  const handleOpenTool = (tool: EditorTool) => {
    setActiveTool(tool)
    setIsPanelOpen(TOOL_META[tool].hasPanel)
  }

  /**
   * A destination in the mobile strip.
   *
   * The strip is a toggle, like the rail: picking the sheet that is already open
   * closes it. "Select" is a mode rather than a panel, so it always closes the
   * sheet and returns the user to the canvas.
   */
  const openMobileTool = (tool: EditorTool) => {
    if (!TOOL_META[tool].hasPanel) {
      setActiveMobileTab(null)
      handleToolChange(tool)
      return
    }

    if (activeMobileTab === tool) {
      setActiveMobileTab(null)
      return
    }

    setActiveMobileTab(tool)
    handleOpenTool(tool)
  }

  const toggleMobileEdit = () => {
    setActiveMobileTab(activeMobileTab === "edit" ? null : "edit")
  }

  const sheetTool =
    activeMobileTab && activeMobileTab !== "edit" ? activeMobileTab : null
  const SheetPanel = sheetTool ? TOOL_PANELS[sheetTool] : null
  const sheetTitle =
    activeMobileTab === "edit"
      ? "Edit"
      : sheetTool
        ? TOOL_META[sheetTool].label
        : ""

  /**
   * Tool selection doubles as the panel toggle, the way it does in Figma and
   * Canva: picking the tool that is already active collapses the panel, and
   * picking any other tool opens it.
   *
   * A tool with no panel always collapses, and that is not the toggle below:
   * toggling would leave `isPanelOpen` true with a panel-less tool active. Two
   * other guards also check for a panel, so it is invisible today - but it
   * breaks the moment either is relaxed.
   */
  const handleToolChange = (tool: EditorTool) => {
    if (!TOOL_META[tool].hasPanel) {
      setActiveTool(tool)
      setIsPanelOpen(false)
      return
    }

    if (tool === activeTool) {
      setIsPanelOpen((open) => !open)
      return
    }

    setActiveTool(tool)
    setIsPanelOpen(true)
  }

  /**
   * `F` for focus mode.
   *
   * Ignored while a text layer is being edited and while a field has focus, for
   * the same reason the tool keys are: typing an "f" should type an "f".
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f") return
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return
      }
      const active = useEditorStore.getState().activeObject as {
        isEditing?: boolean
      } | null
      if (active?.isEditing) return

      event.preventDefault()
      setIsFocusMode((on) => !on)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const paletteHandlers = useMemo(
    () => ({
      onOpenTool: handleOpenTool,
      onToggleInspector: () => {
        setIsInspectorOpen((open) => !open)
        setUserToggledInspector(true)
      },
      onToggleTheme: () => setTheme(isDark ? "light" : "dark"),
      onExport: () => setIsExportModalOpen(true),
      onToggleFocusMode: () => setIsFocusMode((on) => !on),
    }),
    [isDark, setTheme, setIsExportModalOpen]
  )

  // The tool rail advertises these keys in its tooltips, so they need to work.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return
      }

      // Never steal keys while a text layer is being edited on the canvas.
      const active = useEditorStore.getState().activeObject as {
        isEditing?: boolean
      } | null
      if (active?.isEditing) return

      const tool = TOOL_KEYS[event.key.toLowerCase()]
      if (!tool) return

      event.preventDefault()
      handleToolChange(tool)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool])

  return (
    <TooltipProvider>
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background font-sans text-foreground antialiased lg:flex-row">
        <ContextMenu />
        <ExportModal />
        <DesignsModal />
        <GlobalDialogs />
        <CommandPalette
          open={isPaletteOpen}
          onOpenChange={setIsPaletteOpen}
          handlers={paletteHandlers}
        />
        {/* Renders nothing; it writes the document to storage as it changes. */}
        <Autosave />

        {!isFocusMode && (
          <ToolRail
            activeTool={activeTool}
            isPanelOpen={isPanelOpen}
            onToolChange={handleToolChange}
          />
        )}

        {!isFocusMode && isPanelOpen && TOOL_META[activeTool].hasPanel && (
          <ContextPanel
            activeTool={activeTool}
            onClose={() => setIsPanelOpen(false)}
          />
        )}

        <main className="relative flex min-w-0 flex-1 flex-col">
          {!isFocusMode && (
            <TopBar
              isInspectorOpen={isInspectorOpen}
              onToggleInspector={handleToggleInspector}
            />
          )}
          {!isFocusMode && <RestoredNotice />}
          <CanvasWorkspace />
          {isFocusMode && <FocusBar onExit={() => setIsFocusMode(false)} />}
        </main>

        {isInspectorOpen && !isFocusMode && (
          <Inspector
            onClose={() => setIsInspectorOpen(false)}
            onOpenTool={handleOpenTool}
          />
        )}

        <nav
          aria-label="Editor panels"
          className="z-popover relative flex h-[68px] shrink-0 items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {/*
            One strip, built from the tool registry. The old surface offered
            Templates, Edit, Layers and Export, so text, photos, elements,
            brand and cinema were simply absent on a phone - and nothing said
            so. Everything the desktop rail has now has a destination here.
          */}
          {/* The way back to the design library. It was inside the desktop
              history cluster, so a phone had no way to open a saved design. */}
          <button
            type="button"
            onClick={() => void openDesigns()}
            aria-label="Your designs"
            className="flex w-[62px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 text-[10px] text-[var(--text-muted)] transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:text-foreground"
          >
            <LayoutGrid size={19} aria-hidden="true" />
            <span>Designs</span>
          </button>

          <div className="my-4 w-px shrink-0 bg-border" aria-hidden="true" />

          <div className="scrollbar-hide flex min-w-0 flex-1 items-stretch overflow-x-auto overscroll-x-contain">
            <MobileStripButton
              label="Edit"
              icon={<SlidersHorizontal size={19} aria-hidden="true" />}
              active={activeMobileTab === "edit"}
              onClick={toggleMobileEdit}
            />
            {TOOL_ORDER.map((tool) => {
              const Icon = TOOL_ICONS[tool]
              return (
                <MobileStripButton
                  key={tool}
                  label={TOOL_META[tool].label}
                  icon={<Icon size={19} aria-hidden="true" />}
                  active={activeMobileTab === tool}
                  onClick={() => openMobileTool(tool)}
                />
              )
            })}
          </div>

          <div className="my-4 w-px shrink-0 bg-border" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            aria-label="Export"
            className="flex w-[64px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 text-[10px] text-[var(--text-muted)] transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:text-foreground"
          >
            <Download size={19} aria-hidden="true" />
            <span>Export</span>
          </button>
        </nav>

        {activeMobileTab && (
          <div className="z-sheet absolute inset-0 flex flex-col justify-end bg-black/40 backdrop-blur-[1px] lg:hidden">
            <button
              type="button"
              aria-label="Close panel"
              className="flex-1 cursor-pointer"
              onClick={() => setActiveMobileTab(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${sheetTitle} panel`}
              className="flex h-[72dvh] flex-col rounded-t-3xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl"
            >
              <div
                className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"
                aria-hidden="true"
              />
              <div className="flex items-center justify-between border-b border-border px-4 pt-2 pb-3">
                <h2 className="text-[13px] font-semibold text-foreground">
                  {sheetTitle}
                </h2>
                <MobileSheetClose />
              </div>
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                {activeMobileTab === "edit" &&
                  activeObject?.type === "i-text" && (
                    <Button
                      variant="secondary"
                      className="mb-4 w-full"
                      onClick={() => {
                        // Close first so the artwork is visible behind the caret.
                        setActiveMobileTab(null)
                        requestAnimationFrame(() => editActiveText())
                      }}
                    >
                      <PenLine size={14} aria-hidden="true" />
                      Edit the words
                    </Button>
                  )}
                {activeMobileTab === "edit" ? (
                  <InspectorPanelContent onOpenTool={handleOpenTool} />
                ) : SheetPanel ? (
                  <SheetPanel />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

function MobileSheetClose() {
  const setActiveMobileTab = useEditorStore((s) => s.setActiveMobileTab)
  return (
    <button
      type="button"
      aria-label="Close panel"
      onClick={() => setActiveMobileTab(null)}
      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors outline-none hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <X size={15} />
    </button>
  )
}
