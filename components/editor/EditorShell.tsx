"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Layers, LayoutTemplate, Settings2, X } from "lucide-react"

import CanvasWorkspace from "@/components/editor/CanvasWorkspace"
import ContextPanel from "@/components/editor/ContextPanel"
import Autosave from "@/components/editor/Autosave"
import Inspector, { InspectorPanelContent } from "@/components/editor/Inspector"
import RestoredNotice from "@/components/editor/RestoredNotice"
import TopBar from "@/components/editor/TopBar"
import ToolRail, { type EditorTool } from "@/components/editor/ToolRail"
import ContextMenu from "@/components/editor/contextMenu"
import ExportModal from "@/components/modals/ExportModal"
import GlobalDialogs from "@/components/modals/GlobalDialogs"
import LayersPanel from "@/components/panels/LayersPanel"
import TemplatesPanel from "@/components/panels/TemplatesPanel"
import { useEditorStore } from "@/store/useEditorStore"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { MobileTab } from "@/types/store.types"
import { cn } from "@/lib/utils"

/**
 * The editor shell.
 *
 * Regions, largest first: the artboard workspace, then the tool rail, the
 * context panel, and the contextual inspector. The workspace is the only dark
 * surface — everything around it is paper and white card, so the artwork stays
 * the hero (design doc §2).
 */

function MobileTabButton({
  icon,
  label,
  tab,
}: {
  icon: React.ReactNode
  label: string
  tab: MobileTab
}) {
  const activeMobileTab = useEditorStore((s) => s.activeMobileTab)
  const setActiveMobileTab = useEditorStore((s) => s.setActiveMobileTab)
  const isActive = activeMobileTab === tab

  return (
    <button
      type="button"
      onClick={() => setActiveMobileTab(isActive ? null : tab)}
      aria-pressed={isActive}
      className={cn(
        "relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] transition-colors outline-none",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        isActive
          ? "font-medium text-primary"
          : "text-[var(--text-muted)] hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
      )}
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function EditorShell() {
  const activeObject = useEditorStore((s) => s.activeObject)
  const activeMobileTab = useEditorStore((s) => s.activeMobileTab)
  const setActiveMobileTab = useEditorStore((s) => s.setActiveMobileTab)
  const setIsExportModalOpen = useEditorStore((s) => s.setIsExportModalOpen)
  const checkSavedProject = useEditorStore((s) => s.checkSavedProject)
  const initializeCustomFonts = useEditorStore((s) => s.initializeCustomFonts)
  const canvas = useEditorStore((s) => s.canvas)

  const hasRestored = useRef(false)
  const [activeTool, setActiveTool] = useState<EditorTool>("text")
  /**
   * Whether the context panel is showing.
   *
   * Kept separate from `activeTool` on purpose. The panel used to be hidden by
   * switching the active tool to "select", which conflated "which panel" with
   * "is a panel showing" — so collapsing the panel also dropped the tool
   * selection, and the rail highlighted a tool the user had not chosen.
   */
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [userToggledInspector, setUserToggledInspector] = useState(false)

  // Auto-open the inspector on the first selection, but never fight the user
  // after they have closed it deliberately.
  useEffect(() => {
    if (activeObject && !isInspectorOpen && !userToggledInspector) {
      setIsInspectorOpen(true)
    }
  }, [activeObject, isInspectorOpen, userToggledInspector])

  useEffect(() => {
    checkSavedProject()
  }, [checkSavedProject])

  /**
   * Brings the stored document back, once, when the canvas exists.
   *
   * This is a single-document editor, so the alternative — opening empty every
   * time while the previous document sits in storage — is the worse failure: it
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
    // its first pass and then cleared `restoredAt` on its second — so the notice
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

  const handleToggleInspector = () => {
    setIsInspectorOpen((open) => !open)
    setUserToggledInspector(true)
  }

  /**
   * Tool selection doubles as the panel toggle, the way it does in Figma and
   * Canva: picking the tool that is already active collapses the panel, and
   * picking any other tool opens it. "Select" is a mode rather than a panel,
   * so it always collapses.
   */
  /**
   * Opens a tool's panel, unconditionally.
   *
   * `handleToolChange` is a *toggle* — picking the active tool collapses the
   * panel — which is right for the rail and wrong for a hand-off from the
   * inspector: "Open the Cinema panel" while Cinema was already the active tool
   * closed the very panel it promised to open.
   */
  const handleOpenTool = (tool: EditorTool) => {
    setActiveTool(tool)
    setIsPanelOpen(tool !== "select")
  }

  const handleToolChange = (tool: EditorTool) => {
    if (tool === "select") {
      setActiveTool("select")
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

  // The tool rail advertises these keys in its tooltips, so they need to work.
  useEffect(() => {
    const TOOL_KEYS: Record<string, EditorTool> = {
      v: "select",
      t: "text",
      m: "media",
      p: "templates",
      c: "cinema",
      l: "layers",
    }

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
        <GlobalDialogs />
        {/* Renders nothing; it writes the document to storage as it changes. */}
        <Autosave />

        <ToolRail
          activeTool={activeTool}
          isPanelOpen={isPanelOpen}
          onToolChange={handleToolChange}
        />

        {isPanelOpen && activeTool !== "select" && (
          <ContextPanel
            activeTool={activeTool}
            onClose={() => setIsPanelOpen(false)}
          />
        )}

        <main className="relative flex min-w-0 flex-1 flex-col">
          <TopBar
            isInspectorOpen={isInspectorOpen}
            onToggleInspector={handleToggleInspector}
          />
          <RestoredNotice />
          <CanvasWorkspace />
        </main>

        {isInspectorOpen && (
          <Inspector
            onClose={() => setIsInspectorOpen(false)}
            onOpenTool={handleOpenTool}
          />
        )}

        <nav
          aria-label="Editor panels"
          className="z-popover relative flex h-[68px] shrink-0 items-center border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <MobileTabButton
            icon={<LayoutTemplate size={19} />}
            label="Templates"
            tab="templates"
          />
          <MobileTabButton
            icon={<Settings2 size={19} />}
            label="Edit"
            tab="edit"
          />
          <MobileTabButton
            icon={<Layers size={19} />}
            label="Layers"
            tab="layers"
          />
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] text-[var(--text-muted)] transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <Download size={19} />
            <span>Export</span>
          </button>
        </nav>

        {activeMobileTab && (
          <div className="z-sheet absolute inset-0 flex flex-col justify-end bg-black/30 lg:hidden">
            <button
              type="button"
              aria-label="Close panel"
              className="flex-1 cursor-pointer"
              onClick={() => setActiveMobileTab(null)}
            />
            <div
              role="dialog"
              aria-label={`${activeMobileTab} panel`}
              className="flex h-[65vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-[13px] font-semibold text-foreground capitalize">
                  {activeMobileTab}
                </h2>
                <MobileSheetClose />
              </div>
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
                {activeMobileTab === "templates" && <TemplatesPanel />}
                {activeMobileTab === "edit" && (
                  <InspectorPanelContent onOpenTool={handleOpenTool} />
                )}
                {activeMobileTab === "layers" && <LayersPanel />}
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
