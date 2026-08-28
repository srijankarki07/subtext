"use client"

import TextPanel from "@/components/panels/TextPanel"
import { useEditorStore } from "@/store/editorStore"
import {
  AtSign,
  Download,
  Layers,
  LayoutTemplate,
  Quote,
  Settings2,
  Type,
} from "lucide-react"
import dynamic from "next/dynamic"

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

export default function EditorPage() {
  return (
    // font-sans defaults to SF Pro on Apple devices.
    // pb-[env(safe-area-inset-bottom)] handles the iPhone home indicator seamlessly.
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
        </div>
      </aside>

      {/* MAIN CANVAS AREA */}
      <main className="relative flex flex-1 flex-col">
        {/* Top Toolbar - Clean and minimal */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#1C1C1E] px-4 lg:h-16 lg:border-none lg:bg-transparent lg:px-6">
          <span className="text-[15px] font-medium tracking-tight">
            Cinemate
          </span>

          <div className="flex items-center gap-3">
            {/* Apple style high-contrast primary pill button */}
            <button className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 active:scale-95 lg:hidden">
              Export
            </button>
          </div>
        </div>

        {/* Canvas Wrapper - generous spacing and smooth rounding */}
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

        {/* Mount the Text Panel here */}
        <div className="flex-1 overflow-y-auto">
          <TextPanel />
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION - Apple Glassmorphism style */}
      <nav className="flex h-[68px] shrink-0 items-center justify-around border-t border-white/[0.08] bg-[#1C1C1E]/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <MobileTabButton
          icon={<LayoutTemplate size={22} strokeWidth={1.5} />}
          label="Templates"
        />
        <MobileTabButton
          icon={<Layers size={22} strokeWidth={1.5} />}
          label="Layers"
        />
        <MobileTabButton
          icon={<Settings2 size={22} strokeWidth={1.5} />}
          label="Edit"
        />
        <MobileTabButton
          icon={<Download size={22} strokeWidth={1.5} />}
          label="Export"
        />
      </nav>
    </div>
  )
}

// Helper component for mobile bottom tabs
function MobileTabButton({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <button className="flex flex-1 flex-col items-center justify-center gap-1.5 p-2 text-white/50 transition-colors hover:text-white active:scale-95">
      {icon}
      <span className="text-[10px] font-medium tracking-tight">{label}</span>
    </button>
  )
}
