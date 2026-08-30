"use client"

import ColorPanel from "@/components/panels/ColorPanel"
import FontPicker from "@/components/panels/FontPicker"
import TextPanel from "@/components/panels/TextPanel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASPECT_RATIOS, MobileTab, useEditorStore } from "@/store/editorStore"
import {
  AtSign,
  Download,
  Image,
  Layers,
  LayoutTemplate,
  Quote,
  Settings2,
  Type,
  X,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useState } from "react"

const DynamicCanvas = dynamic(() => import("@/components/editor/Canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black">
      <div className="z-10 flex flex-col items-center gap-4">
        {/* Apple-style minimalist spinner */}
        <div className="relative flex h-8 w-8 items-center justify-center">
          <div className="absolute h-full w-full animate-spin rounded-full border-[3px] border-white/10 border-t-white/80"></div>
        </div>
        <div className="h-2 w-20 animate-pulse rounded-full bg-white/20"></div>
      </div>
    </div>
  ),
})

function AddTextBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-[13px] text-white/80 transition-all hover:bg-white/[0.06] active:scale-[0.98]"
    >
      <span className="text-white/50">{icon}</span>
      {label}
    </button>
  )
}

function RightPanelManager() {
  const { activeObject } = useEditorStore()
  const [activeTab, setActiveTab] = useState<"font" | "style" | "color">("font")

  if (!activeObject || activeObject.type !== "i-text") {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center text-[13px] text-white/40 shadow-inner">
        Select a text layer to edit typography.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* iOS-Style Segmented Control */}
      <div className="mb-4 flex rounded-xl border border-white/[0.05] bg-black/40 p-1">
        <button
          onClick={() => setActiveTab("font")}
          className={`flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-all ${
            activeTab === "font"
              ? "bg-[#2C2C2E] text-white shadow-md"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Font
        </button>
        <button
          onClick={() => setActiveTab("style")}
          className={`flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-all ${
            activeTab === "style"
              ? "bg-[#2C2C2E] text-white shadow-md"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Style
        </button>
        <button
          onClick={() => setActiveTab("color")}
          className={`flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-all ${
            activeTab === "color"
              ? "bg-[#2C2C2E] text-white shadow-md"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Color
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "font" && <FontPicker />}
        {activeTab === "style" && <TextPanel />}
        {activeTab === "color" && <ColorPanel />}
      </div>
    </div>
  )
}

export default function EditorPage() {
  const {
    setAspectRatio,
    activeMobileTab,
    setActiveMobileTab,
    addImage,
    addText,
  } = useEditorStore()

  // Local state for the custom aspect ratio inputs
  const [ratioSelection, setRatioSelection] = useState<string>("")
  const [customW, setCustomW] = useState<number>(1080)
  const [customH, setCustomH] = useState<number>(1080)

  // const handleRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   const val = e.target.value
  //   setRatioSelection(val)

  //   // If it's a preset, apply it immediately
  //   if (val !== "custom" && ASPECT_RATIOS[val as keyof typeof ASPECT_RATIOS]) {
  //     const { width, height } = ASPECT_RATIOS[val as keyof typeof ASPECT_RATIOS]
  //     setAspectRatio(width, height)
  //   }
  // }

  const handleRatioChange = (val: string) => {
    setRatioSelection(val)

    // If it's a preset, apply it immediately
    if (val !== "custom" && ASPECT_RATIOS[val as keyof typeof ASPECT_RATIOS]) {
      const { width, height } = ASPECT_RATIOS[val as keyof typeof ASPECT_RATIOS]

      setAspectRatio(width, height)
    }
  }

  const applyCustomRatio = () => {
    if (customW > 100 && customH > 100) {
      setAspectRatio(customW, customH)
    }
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-black font-sans text-white antialiased selection:bg-white/30 lg:flex-row">
      {/* DESKTOP LEFT PANEL */}
      <aside className="hidden w-72 flex-col border-r border-white/[0.08] bg-[#1C1C1E] p-5 lg:flex">
        <h2 className="mb-6 text-[11px] font-semibold tracking-wider text-white/50 uppercase">
          Add Elements
        </h2>

        {/* Add Text Buttons */}
        <div className="flex flex-col gap-2">
          <AddTextBtn
            icon={<Type size={16} />}
            label="Add Quote Block"
            onClick={() => useEditorStore.getState().addText("quote")}
          />
          <AddTextBtn
            icon={<Quote size={16} />}
            label="Add Author Name"
            onClick={() => useEditorStore.getState().addText("author")}
          />
          <AddTextBtn
            icon={<AtSign size={16} />}
            label="Add Social Handle"
            onClick={() => useEditorStore.getState().addText("handle")}
          />

          <AddTextBtn
            icon={<Image size={16} />}
            label="Add Image"
            onClick={() => useEditorStore.getState().addImage()}
          />
        </div>
      </aside>

      {/* MAIN CANVAS AREA */}
      <main className="relative flex flex-1 flex-col">
        {/* TOP TOOLBAR */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#1C1C1E] px-4 lg:h-16 lg:border-none lg:bg-transparent lg:px-6">
          <span className="text-[15px] font-medium tracking-tight">
            Cinemate
          </span>

          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            {/* Custom Inputs (Shows only when 'custom' is selected) */}
            {ratioSelection === "custom" && (
              <div className="flex animate-in items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.05] p-1 duration-200 fade-in zoom-in">
                <input
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(Number(e.target.value))}
                  className="w-12 [appearance:textfield] rounded bg-transparent text-center text-[12px] text-white outline-none focus:bg-white/[0.05] lg:w-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="W"
                />
                <span className="text-[10px] text-white/40">×</span>
                <input
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(Number(e.target.value))}
                  className="w-12 [appearance:textfield] rounded bg-transparent text-center text-[12px] text-white outline-none focus:bg-white/[0.05] lg:w-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="H"
                />
                <button
                  onClick={applyCustomRatio}
                  className="ml-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-black transition-all active:scale-95"
                >
                  Apply
                </button>
              </div>
            )}

            {/* ASPECT RATIO SELECTOR */}
            <Select
              value={ratioSelection}
              onValueChange={(val) => handleRatioChange(val as string)}
            >
              <SelectTrigger className="w-auto min-w-[140px] cursor-pointer rounded-lg border-white/[0.1] bg-white/[0.05] px-2 py-1.5 text-[12px] text-white outline-none focus:border-white/30 focus:ring-0">
                <SelectValue placeholder="Select Canvas Size" />
              </SelectTrigger>

              <SelectContent className="border-white/[0.1] bg-[#1C1C1E] p-2 text-white">
                {Object.keys(ASPECT_RATIOS).map((ratio) => (
                  <SelectItem
                    key={ratio}
                    value={ratio}
                    className="cursor-pointer text-[12px]"
                  >
                    {ratio}
                  </SelectItem>
                ))}

                <SelectItem
                  value="custom"
                  className="cursor-pointer text-[12px]"
                >
                  Custom Size...
                </SelectItem>
              </SelectContent>
            </Select>

            <button className="hidden rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 active:scale-95 lg:block">
              Export
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 lg:p-6 lg:pt-0">
          <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/[0.12] bg-[#0A0A0A] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <DynamicCanvas />
          </div>
        </div>
      </main>

      {/* DESKTOP RIGHT PANEL */}
      <aside className="hidden w-[340px] flex-col border-l border-white/[0.08] bg-[#1C1C1E] p-5 lg:flex">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
            Properties
          </h2>
          {/* Desktop Export Button */}
          <button className="rounded-full bg-white px-5 py-1.5 text-[13px] font-semibold text-black transition-all hover:bg-gray-200 active:scale-95">
            Export
          </button>
        </div>

        {/* We use a separate component to manage Right Panel state without re-rendering the whole page */}
        <RightPanelManager />
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="relative z-50 flex h-[68px] shrink-0 items-center justify-around border-t border-white/[0.08] bg-[#1C1C1E]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <MobileTabButton
          icon={<LayoutTemplate size={22} />}
          label="Add"
          tab="templates"
        />
        <MobileTabButton
          icon={<Settings2 size={22} />}
          label="Edit Text"
          tab="edit"
        />
        <MobileTabButton
          icon={<Layers size={22} />}
          label="Layers"
          tab="layers"
        />
        <MobileTabButton
          icon={<Download size={22} />}
          label="Export"
          tab="export"
        />
      </nav>
      {/* MOBILE SLIDE-UP SHEETS */}
      {activeMobileTab && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col justify-end bg-black/40 backdrop-blur-sm lg:hidden">
          {/* Invisible backdrop to close on tap */}
          <div className="flex-1" onClick={() => setActiveMobileTab(null)} />

          {/* The Sheet */}
          <div className="flex h-[60vh] animate-in flex-col rounded-t-3xl border-t border-white/[0.08] bg-[#1C1C1E] duration-200 slide-in-from-bottom-full">
            <div className="flex items-center justify-between border-b border-white/[0.05] p-4">
              <h3 className="text-[13px] font-semibold tracking-wide text-white/80 uppercase">
                {activeMobileTab}
              </h3>
              <button
                onClick={() => setActiveMobileTab(null)}
                className="rounded-full bg-white/5 p-2 text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeMobileTab === "templates" && (
                <div className="flex flex-col gap-2">
                  {/* Reuse the Add Text buttons here for mobile */}
                  <button
                    onClick={() => {
                      useEditorStore.getState().addText("quote")
                      setActiveMobileTab(null)
                    }}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-sm"
                  >
                    Add Quote Text
                  </button>
                  <button
                    onClick={() => {
                      useEditorStore.getState().addText("author")
                      setActiveMobileTab(null)
                    }}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-sm"
                  >
                    Add Author Text
                  </button>
                  <button
                    onClick={() => {
                      useEditorStore.getState().addText("handle")
                      setActiveMobileTab(null)
                    }}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-sm"
                  >
                    Add handle
                  </button>
                  <button
                    onClick={() => {
                      useEditorStore.getState().addImage()
                      setActiveMobileTab(null)
                    }}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-sm"
                  >
                    Add Image
                  </button>
                </div>
              )}
              {activeMobileTab === "edit" && <RightPanelManager />}
              {activeMobileTab === "layers" && (
                <p className="mt-10 text-center text-sm text-white/40">
                  Layers coming soon
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component for mobile bottom tabs
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
      className={`flex flex-1 flex-col items-center justify-center gap-1.5 p-2 transition-colors active:scale-95 ${isActive ? "text-blue-500" : "text-white/50 hover:text-white"}`}
    >
      {icon}
      <span className="text-[10px] font-medium tracking-tight">{label}</span>
    </button>
  )
}
