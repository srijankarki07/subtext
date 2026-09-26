"use client"

import { useEditorStore } from "@/store/useEditorStore"
import { Check, Clock, History, Layers } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function HistoryDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { history, historyIndex, jumpToHistoryIndex } = useEditorStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside)
    }
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const handleSelect = async (idx: number) => {
    await jumpToHistoryIndex(idx)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Browse History Stack"
        className={`relative flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-all active:scale-95 ${
          isOpen
            ? "bg-[#D6B47A]/20 text-[#D6B47A]"
            : "text-white/50 hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        <History size={15} />
        {history.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#D6B47A] px-1 font-mono text-[8px] font-bold text-black shadow-sm">
            {historyIndex + 1}
          </span>
        )}
      </button>

      {/* TIMELINE POPOVER */}
      {isOpen && (
        <div className="absolute top-10 left-0 z-[150] w-72 animate-in overflow-hidden rounded-md border border-white/[0.1] bg-[#141414]/95 p-3 font-sans text-white shadow-2xl backdrop-blur-2xl duration-150 zoom-in-95 fade-in">
          {/* HEADER */}
          <div className="mb-2.5 flex items-center justify-between border-b border-white/[0.06] px-1 pb-2">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-[#D6B47A]" />
              <span className="text-[11px] font-semibold text-white/80">
                Version Timeline
              </span>
            </div>
            <span className="font-mono text-[9px] text-white/40">
              {historyIndex + 1} / {history.length} states
            </span>
          </div>

          {/* HISTORY ITEM LIST */}
          <div className="custom-scrollbar max-h-72 space-y-1 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-white/40">
                No edits recorded yet
              </div>
            ) : (
              history.map((item, idx) => {
                const isCurrent = idx === historyIndex
                const isPast = idx < historyIndex
                const isFuture = idx > historyIndex

                return (
                  <button
                    key={item.id || idx}
                    onClick={() => handleSelect(idx)}
                    className={`group relative flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-left transition-all ${
                      isCurrent
                        ? "border border-[#D6B47A]/50 bg-[#D6B47A]/10 text-white shadow-[0_0_15px_rgba(214,180,122,0.1)]"
                        : isFuture
                          ? "opacity-45 hover:bg-white/[0.04] hover:opacity-100"
                          : "text-white/80 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5 pr-2">
                      <span
                        className={`shrink-0 font-mono text-[10px] ${isCurrent ? "font-bold text-[#D6B47A]" : "text-white/30"}`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[11px] leading-tight font-medium">
                          {item.title}
                        </span>
                        <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-white/35">
                          <span>{item.timestamp}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Layers size={9} />
                            {item.objectCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#D6B47A] px-1.5 py-0.5 font-sans text-[8px] font-bold text-black uppercase">
                        <Check size={9} /> Current
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
