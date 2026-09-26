"use client"

import ContextMenu from "@/components/editor/contextMenu"
import HistoryDropdown from "@/components/editor/HistoryDropdown"
import ToolRail, { EditorTool } from "@/components/editor/ToolRail"
import ExportModal from "@/components/modals/ExportModal"
import GlobalDialogs from "@/components/modals/GlobalDialogs"
import ColorPanel from "@/components/panels/ColorPanel"
import EffectsPanel from "@/components/panels/EffectPanel"
import FontPicker from "@/components/panels/FontPicker"
import ImagePanel from "@/components/panels/ImagePanel"
import LayersPanel from "@/components/panels/LayersPanel"
import TemplatesPanel from "@/components/panels/TemplatesPanel"
import TextPanel from "@/components/panels/TextPanel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASPECT_RATIOS, useEditorStore } from "@/store/useEditorStore"
import { MobileTab } from "@/types/store.types"
import {
  AtSign,
  Check,
  Download,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Quote,
  Redo2,
  Save,
  Settings2,
  Type,
  Undo2,
  X,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const DynamicCanvas = dynamic(() => import("@/components/editor/Canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#080808]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-7 w-7">
          <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[#D6B47A]/60" />
        </div>
        <span className="text-[10px] tracking-[0.18em] text-white/20 uppercase">
          Preparing canvas
        </span>
      </div>
    </div>
  ),
})

function AddElement({
  icon,
  eyebrow,
  title,
  onClick,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-3.5 rounded-md px-3 py-3 text-left transition-all duration-200 hover:bg-white/[0.045] active:scale-[0.985]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.025] text-white/45 transition-colors group-hover:border-white/[0.1] group-hover:bg-white/[0.06] group-hover:text-white/80">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-white/80 transition-colors group-hover:text-white">
          {title}
        </span>
        <span className="mt-0.5 block text-[9px] tracking-[0.08em] text-white/25 uppercase">
          {eyebrow}
        </span>
      </span>
    </button>
  )
}

function RightPanelManager() {
  const { setConfirmDialog,  activeObject } = useEditorStore()
  const [activeTab, setActiveTab] = useState<"font" | "style" | "color">("style")

  const tabs = [
    { id: "font" as const, label: "Type" },
    { id: "style" as const, label: "Style" },
    { id: "color" as const, label: "Color" },
  ]

  if (!activeObject) {
    return (
      <div className="flex animate-in flex-col items-center justify-center rounded-md border border-dashed border-white/[0.08] bg-white/[0.015] p-6 text-center duration-150 fade-in h-full">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-white/30">
          <Type size={16} />
        </div>
        <h3 className="text-[13px] font-semibold text-white/80">
          No Layer Selected
        </h3>
        <p className="mt-1 max-w-[200px] text-[11px] leading-relaxed text-white/30">
          Select any element on the artboard to adjust its properties.
        </p>

        <div className="mt-5 w-full space-y-2 border-t border-white/[0.06] pt-4">
          <span className="block text-[9px] font-semibold tracking-wider text-white/30 uppercase">
            Quick Actions
          </span>
          <button
            onClick={() => useEditorStore.getState().addText("quote")}
            className="flex w-full cursor-pointer items-center justify-between rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px] text-white/70 transition-all hover:bg-white/[0.05] hover:text-white"
          >
            <span>Add Quote Typography</span>
            <span className="font-mono text-[9px] text-white/30">
              +Text
            </span>
          </button>
          <button
            onClick={() => useEditorStore.getState().addImage()}
            className="flex w-full cursor-pointer items-center justify-between rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px] text-white/70 transition-all hover:bg-white/[0.05] hover:text-white"
          >
            <span>Upload Artwork / Photo</span>
            <span className="font-mono text-[9px] text-white/30">
              +Media
            </span>
          </button>
        </div>
      </div>
    )
  }

  if (activeObject.type === "image" && !(activeObject as any).isEffect) {
    return (
      <div className="flex h-full animate-in flex-col gap-4 duration-150 fade-in">
        <h2 className="border-b border-white/[0.08] pb-2 text-[12px] font-medium text-white/80">
          Image Properties
        </h2>
        <ImagePanel />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 cursor-pointer pb-3 text-[11px] font-medium transition-colors ${
              activeTab === tab.id
                ? "font-semibold text-white"
                : "text-white/30 hover:text-white/70"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#D6B47A]" />
            )}
          </button>
        ))}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto select-none">
        <div className="animate-in duration-150 fade-in">
          {activeTab === "font" && <FontPicker />}
          {activeTab === "style" && <TextPanel />}
          {activeTab === "color" && <ColorPanel />}
        </div>
      </div>
    </div>
  )
}

export default function EditorPage() {
  const { setConfirmDialog, activeObject, setAspectRatio,
    activeMobileTab,
    setActiveMobileTab,
    setIsExportModalOpen,
    saveProjectToStorage,
    loadProjectFromStorage,
    hasSavedProject,
    lastSavedAt,
    checkSavedProject,
    initializeCustomFonts,
  } = useEditorStore()

  // Local feedback state for the save button
  const [justSaved, setJustSaved] = useState(false)
  const [documentTitle, setDocumentTitle] = useState("Untitled")
  const [activeTool, setActiveTool] = useState<EditorTool>("text")
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [userToggledInspector, setUserToggledInspector] = useState(false)

  // Auto-open inspector only when an object is selected and the user hasn't manually closed it
  useEffect(() => {
    if (activeObject && !isInspectorOpen && !userToggledInspector) {
      setIsInspectorOpen(true)
    }
  }, [activeObject, isInspectorOpen, userToggledInspector])

  // Check on load if previous save exists
  useEffect(() => {
    checkSavedProject()
  }, [checkSavedProject])

  useEffect(() => {
    void initializeCustomFonts()
  }, [initializeCustomFonts])

  const handleSave = () => {
    const success = saveProjectToStorage()
    if (success) {
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
  }

  const handleRestore = () => {
    setConfirmDialog({
      title: "Restore Project",
      message: "Restore saved project from local storage? Current unsaved changes will be overwritten.",
      confirmText: "Restore",
      onConfirm: async () => {
        await loadProjectFromStorage()
      }
    })
  }

  const [ratioSelection, setRatioSelection] = useState("")
  const [customW, setCustomW] = useState(1080)
  const [customH, setCustomH] = useState(1080)

  const handleRatioChange = (val: string) => {
    setRatioSelection(val)
    if (val !== "custom" && ASPECT_RATIOS[val as keyof typeof ASPECT_RATIOS]) {
      const { width, height } = ASPECT_RATIOS[val as keyof typeof ASPECT_RATIOS]
      setAspectRatio(width, height)
    }
  }

  const applyCustomRatio = () => {
    if (customW > 100 && customH > 100) setAspectRatio(customW, customH)
  }

  const handleToolChange = (tool: EditorTool) => {
    setActiveTool(tool)
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0B0B0A] font-sans text-[#F5F4EF] antialiased selection:bg-[#D5B477]/30 lg:flex-row">
      <ContextMenu />
      <ExportModal />
      <GlobalDialogs />
      <ToolRail activeTool={activeTool} onToolChange={handleToolChange} />
      <aside
        className={`hidden w-[248px] shrink-0 flex-col border-r border-white/[0.07] bg-[#121210] select-none lg:flex ${activeTool === "select" ? "lg:hidden" : ""}`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5">
          <div>
            <div className="text-[16px] font-medium tracking-[-0.02em] text-[#F5F4EF]">
              {activeTool === "templates"
                ? "Templates"
                : activeTool === "cinema"
                  ? "Cinema"
                  : activeTool === "layers"
                    ? "Layers"
                    : activeTool === "media"
                      ? "Media"
                      : "Typography"}
            </div>
            <div className="mt-1 text-[11px] text-[#6E6B63]">
              Make the words belong to the image.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTool("select")}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#6E6B63] transition-colors hover:bg-white/[0.06] hover:text-[#F5F4EF]"
            aria-label="Close tool panel"
          >
            <X size={14} />
          </button>
        </div>

        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          {activeTool === "templates" ? (
            <TemplatesPanel />
          ) : activeTool === "layers" ? (
            <LayersPanel />
          ) : activeTool === "cinema" ? (
            <EffectsPanel />
          ) : (
            <>
              <div className="mb-5 text-[12px] leading-relaxed text-[#A7A49A]">
                Add a considered starting point, then refine it on the artboard.
              </div>
              <div className="flex flex-col gap-0.5">
                <AddElement
                  icon={<Type size={15} />}
                  eyebrow="Typography"
                  title="Quote"
                  onClick={() => useEditorStore.getState().addText("quote")}
                />
                <AddElement
                  icon={<Quote size={15} />}
                  eyebrow="Typography"
                  title="Author"
                  onClick={() => useEditorStore.getState().addText("author")}
                />
                <AddElement
                  icon={<AtSign size={15} />}
                  eyebrow="Typography"
                  title="Social handle"
                  onClick={() => useEditorStore.getState().addText("handle")}
                />
                <div className="my-3 h-px bg-white/[0.045]" />
                <AddElement
                  icon={<ImageIcon size={15} />}
                  eyebrow="Media"
                  title="Image"
                  onClick={() => useEditorStore.getState().addImage()}
                />
              </div>

              <div className="mt-auto border-t border-white/[0.07] pt-5">
                <p className="text-[11px] leading-relaxed text-[#6E6B63]">
                  Keep typography simple. Let the image do the cinematic work.
                </p>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col bg-[#0D0D0C]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-4 select-none lg:h-[64px] lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="text-[14px] font-medium tracking-[-0.02em] text-[#F5F4EF]">
              Subtext
            </div>
            <div className="h-4 w-px bg-white/[0.1]" />
            <input
              aria-label="Document title"
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              className="w-[96px] min-w-0 bg-transparent text-[13px] text-[#A7A49A] transition-colors outline-none placeholder:text-[#6E6B63] focus:text-[#F5F4EF] sm:w-[140px]"
            />
            <span className="hidden items-center gap-1.5 text-[11px] text-[#6E6B63] sm:flex">
              <span
                className={`h-1.5 w-1.5 rounded-full ${justSaved || lastSavedAt ? "bg-[#4FD1A5]" : "bg-[#6E6B63]"}`}
              />
              {justSaved ? "Saved" : lastSavedAt ? "Saved" : "Unsaved"}
            </span>
          </div>

          {/* UNDO / REDO / HISTORY / SAVE / RESTORE CONTROLS WITH BADGES */}
          <div className="hidden items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-1 lg:flex">
            <button
              onClick={() => useEditorStore.getState().undo()}
              disabled={!useEditorStore((s) => s.canUndo)}
              title="Undo (Ctrl+Z)"
              className="group relative cursor-pointer rounded-md p-1.5 text-white/50 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <Undo2 size={15} />
            </button>

            <button
              onClick={() => useEditorStore.getState().redo()}
              disabled={!useEditorStore((s) => s.canRedo)}
              title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              className="group relative cursor-pointer rounded-md p-1.5 text-white/50 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <Redo2 size={15} />
            </button>

            <HistoryDropdown />

            <div className="mx-1 h-3.5 w-px bg-white/10" />

            {/* SAVE BUTTON WITH SHORTCUT HINT */}
            <button
              onClick={handleSave}
              title={
                lastSavedAt
                  ? `Saved at ${lastSavedAt} (Ctrl+S)`
                  : "Save Project (Ctrl+S)"
              }
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all active:scale-95 ${
                justSaved
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-white/60 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {justSaved ? <Check size={13} /> : <Save size={13} />}
              <span>{justSaved ? "Saved!" : "Save"}</span>
            </button>

            {/* RESTORE BUTTON */}
            <button
              onClick={handleRestore}
              disabled={!hasSavedProject}
              title={
                hasSavedProject
                  ? "Restore saved project from browser storage"
                  : "No saved project found"
              }
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <FolderOpen size={13} />
              <span>Restore</span>
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {ratioSelection === "custom" && (
              <div className="hidden items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.025] p-1 sm:flex">
                <input
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(Number(e.target.value))}
                  className="w-12 bg-transparent text-center text-[10px] text-white outline-none"
                  placeholder="W"
                />
                <span className="text-[9px] text-white/20">×</span>
                <input
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(Number(e.target.value))}
                  className="w-12 bg-transparent text-center text-[10px] text-white outline-none"
                  placeholder="H"
                />
                <button
                  onClick={applyCustomRatio}
                  className="cursor-pointer rounded-md bg-white px-2 py-1 text-[9px] font-semibold text-black transition-transform active:scale-95"
                >
                  Apply
                </button>
              </div>
            )}

            <Select
              value={ratioSelection}
              onValueChange={(val) => handleRatioChange(val as string)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[96px] cursor-pointer rounded-md border-white/[0.07] bg-white/[0.03] px-3 text-[10px] text-[#A7A49A] shadow-none outline-none focus:ring-0 lg:min-w-[118px]">
                <SelectValue placeholder="Canvas size" />
              </SelectTrigger>
              <SelectContent className="border-white/[0.08] bg-[#171717] text-white">
                {Object.keys(ASPECT_RATIOS).map((ratio) => (
                  <SelectItem
                    key={ratio}
                    value={ratio}
                    className="cursor-pointer text-[11px]"
                  >
                    {ratio}
                  </SelectItem>
                ))}
                <SelectItem
                  value="custom"
                  className="cursor-pointer text-[11px]"
                >
                  Custom canvas
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="mx-1 hidden h-5 w-px bg-white/[0.07] lg:block" />

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="group flex h-8 cursor-pointer items-center gap-2 rounded-md bg-[#D5B477] px-3.5 text-[10px] font-semibold text-[#151512] transition-all hover:bg-[#E4C88F] active:scale-[0.97]"
            >
              <Download
                size={12}
                className="transition-transform group-hover:-translate-y-0.5"
              />
              Export
            </button>
            <button
              onClick={() => {
                setIsInspectorOpen(!isInspectorOpen)
                setUserToggledInspector(true)
              }}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border transition-colors ${
                isInspectorOpen
                  ? "border-[#D5B477]/30 bg-[#D5B477]/10 text-[#D5B477]"
                  : "border-white/[0.07] bg-white/[0.03] text-[#A7A49A] hover:bg-white/[0.06] hover:text-[#F5F4EF]"
              }`}
              title="Toggle Inspector"
            >
              <Settings2 size={14} />
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5 lg:p-8">
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D5B477]/[0.025] blur-[120px]" />
          <div className="relative h-full w-full overflow-hidden rounded-md border border-white/[0.05] bg-[#0B0B0A] shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md border border-white/[0.07] bg-[#121210]/80 px-2.5 py-1.5 backdrop-blur-md lg:top-4 lg:left-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D5B477]/70" />
              <span className="text-[9px] text-[#A7A49A]">Artboard</span>
            </div>
            <div className="pointer-events-none absolute right-3 bottom-3 z-10 flex items-center gap-2 rounded-md border border-white/[0.07] bg-[#121210]/80 px-2.5 py-1.5 text-[10px] text-[#A7A49A] backdrop-blur-md lg:right-4 lg:bottom-4">
              <span>100%</span>
              <span className="text-[#6E6B63]">·</span>
              <span>{ratioSelection || "Square"}</span>
            </div>
            <DynamicCanvas />
          </div>
        </div>

        <div className="hidden h-7 shrink-0 items-center justify-between border-t border-white/[0.05] px-6 select-none lg:flex">
          <span className="text-[10px] text-[#6E6B63]">Canvas workspace</span>
          <span className="text-[10px] text-[#6E6B63]">
            Drag an image to begin
          </span>
        </div>
      </main>

      {isInspectorOpen && (
      <aside className="hidden w-[320px] shrink-0 flex-col border-l border-white/[0.055] bg-[#101010] select-none lg:flex">
        <div className="flex h-[72px] shrink-0 items-center border-b border-white/[0.055] px-5">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] text-white/50 uppercase">
              Inspector
            </div>
            <div className="mt-1 text-[9px] text-white/20">
              Typography & appearance
            </div>
          </div>
          <button 
            onClick={() => setIsInspectorOpen(false)}
            className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.025] text-white/30 transition-colors hover:text-white/70"
            title="Close Inspector"
          >
            <X size={13} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
          <RightPanelManager />
        </div>
      </aside>
      )}

      <nav className="relative z-50 flex h-[68px] shrink-0 items-center border-t border-white/[0.07] bg-[#101010]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden">
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
          onClick={() => setIsExportModalOpen(true)}
          className="relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 text-white/30 transition-colors hover:text-white/70"
        >
          <Download size={19} />
          <span className="text-[9px] font-medium tracking-[0.05em]">
            Export
          </span>
        </button>
      </nav>

      {activeMobileTab && (
        <div className="pointer-events-auto absolute inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="flex-1" onClick={() => setActiveMobileTab(null)} />
          <div className="flex h-[65vh] flex-col rounded-t-[26px] border-t border-white/[0.08] bg-[#111111] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-white/[0.055] px-5 py-4">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
                  {activeMobileTab}
                </div>
                <div className="mt-1 text-[9px] text-white/20">
                  Subtext controls
                </div>
              </div>
              <button
                onClick={() => setActiveMobileTab(null)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/[0.05] text-white/40 transition-colors hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
              {activeMobileTab === "templates" && <TemplatesPanel />}
              {activeMobileTab === "edit" && <RightPanelManager />}
              {activeMobileTab === "layers" && <LayersPanel />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MobileTabButton({
  icon,
  label,
  tab,
}: {
  icon: React.ReactNode
  label: string
  tab: MobileTab
}) {
  const { activeMobileTab, setActiveMobileTab } = useEditorStore()
  const isActive = activeMobileTab === tab

  return (
    <button
      onClick={() => setActiveMobileTab(isActive ? null : tab)}
      className={`relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 transition-colors ${
        isActive ? "text-[#D6B47A]" : "text-white/30 hover:text-white/70"
      }`}
    >
      {isActive && <span className="absolute top-0 h-[2px] w-8 bg-[#D6B47A]" />}
      {icon}
      <span className="text-[9px] font-medium tracking-[0.05em]">{label}</span>
    </button>
  )
}
