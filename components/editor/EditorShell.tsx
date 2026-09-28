"use client"

import { useEffect, useState } from "react"
import { Download, Layers, LayoutTemplate, Settings2, X } from "lucide-react"

import CanvasWorkspace from "@/components/editor/CanvasWorkspace"
import ContextPanel from "@/components/editor/ContextPanel"
import Inspector, { InspectorPanelContent } from "@/components/editor/Inspector"
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
        "relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] outline-none transition-colors",
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

  const [activeTool, setActiveTool] = useState<EditorTool>("text")
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

  useEffect(() => {
    void initializeCustomFonts()
  }, [initializeCustomFonts])

  const handleToggleInspector = () => {
    setIsInspectorOpen((open) => !open)
    setUserToggledInspector(true)
  }

  return (
    <TooltipProvider>
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background font-sans text-foreground antialiased lg:flex-row">
        <ContextMenu />
        <ExportModal />
        <GlobalDialogs />

        <ToolRail activeTool={activeTool} onToolChange={setActiveTool} />

        <ContextPanel
          activeTool={activeTool}
          onClose={() => setActiveTool("select")}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <TopBar
            isInspectorOpen={isInspectorOpen}
            onToggleInspector={handleToggleInspector}
          />
          <CanvasWorkspace />
        </main>

        {isInspectorOpen && (
          <Inspector onClose={() => setIsInspectorOpen(false)} />
        )}

        <nav
          aria-label="Editor panels"
          className="relative z-50 flex h-[68px] shrink-0 items-center border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
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
            className="relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] text-[var(--text-muted)] outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <Download size={19} />
            <span>Export</span>
          </button>
        </nav>

        {activeMobileTab && (
          <div className="absolute inset-0 z-[100] flex flex-col justify-end bg-black/30 lg:hidden">
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
                {activeMobileTab === "edit" && <InspectorPanelContent />}
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
      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition-colors hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <X size={15} />
    </button>
  )
}
