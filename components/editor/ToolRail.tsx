"use client"

import {
  Braces,
  ImagePlus,
  Layers3,
  LayoutTemplate,
  MonitorPlay,
  MousePointer2,
  Type,
} from "lucide-react"

export type EditorTool =
  "select" | "text" | "media" | "templates" | "cinema" | "layers"

const tools = [
  { id: "select" as const, label: "Select", icon: MousePointer2 },
  { id: "text" as const, label: "Text", icon: Type },
  { id: "media" as const, label: "Media", icon: ImagePlus },
  { id: "templates" as const, label: "Templates", icon: LayoutTemplate },
  { id: "cinema" as const, label: "Cinema", icon: MonitorPlay },
  { id: "layers" as const, label: "Layers", icon: Layers3 },
]

export default function ToolRail({
  activeTool,
  onToolChange,
}: {
  activeTool: EditorTool
  onToolChange: (tool: EditorTool) => void
}) {
  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center border-r border-white/[0.07] bg-[#121210] py-3 lg:flex">
      <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-md border border-[#D5B477]/25 bg-[#D5B477]/[0.08] font-serif text-[15px] text-[#D5B477]">
        S
      </div>

      <nav
        className="flex flex-col items-center gap-1.5"
        aria-label="Editor tools"
      >
        {tools.map(({ id, label, icon: Icon }) => {
          const isActive = activeTool === id

          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={isActive}
              title={label}
              onClick={() => onToolChange(id)}
              className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-all duration-150 ${
                isActive
                  ? "bg-[#D5B477]/[0.12] text-[#D5B477]"
                  : "text-[#6E6B63] hover:bg-white/[0.06] hover:text-[#F5F4EF]"
              }`}
            >
              {isActive && (
                <span className="absolute -left-[13px] h-5 w-0.5 rounded-r-full bg-[#D5B477]" />
              )}
              <Icon size={17} strokeWidth={1.7} />
              <span className="pointer-events-none absolute left-12 z-50 hidden rounded-md border border-white/[0.08] bg-[#181815] px-2 py-1 text-[11px] whitespace-nowrap text-[#F5F4EF] shadow-[0_12px_40px_rgba(0,0,0,0.28)] group-hover:block">
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1.5">
        <button
          type="button"
          aria-label="Layout"
          title="Layout"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-[#6E6B63] transition-colors hover:bg-white/[0.06] hover:text-[#F5F4EF]"
        >
          <Braces size={17} strokeWidth={1.7} />
        </button>
      </div>
    </aside>
  )
}
