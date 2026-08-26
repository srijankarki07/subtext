"use client"

import { useEditorStore } from "@/store/editorStore"
import { IText } from "fabric"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Trash2,
} from "lucide-react"
import { useReducer } from "react"

interface AppleSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (val: number) => void
}

export default function TextPanel() {
  const { canvas, activeObject, deleteActiveObject } = useEditorStore()

  // A lightweight way to force React to re-render without complex useEffect syncing
  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  if (!activeObject || activeObject.type !== "i-text") {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-white/40">
        <p className="text-[13px]">Select a text layer to edit properties.</p>
      </div>
    )
  }

  // Cast activeObject safely to access text properties
  const textObj = activeObject as IText

  // Derive values directly from the object (Single Source of Truth)
  const fontSize = (textObj.get("fontSize") as number) || 40
  const charSpacing = (textObj.get("charSpacing") as number) || 0
  const lineHeight = (textObj.get("lineHeight") as number) || 1.1

  // Strictly typed update function
  const updateTextProp = (key: keyof IText, value: string | number) => {
    if (!textObj || !canvas) return

    textObj.set(key, value)
    canvas.requestRenderAll()
    forceUpdate() // Re-render this panel to show updated slider values
  }

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* ALIGNMENT & STYLE */}
      <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-1">
        <div className="flex gap-1">
          <FormatButton
            icon={<AlignLeft size={16} />}
            isActive={textObj.get("textAlign") === "left"}
            onClick={() => updateTextProp("textAlign", "left")}
          />
          <FormatButton
            icon={<AlignCenter size={16} />}
            isActive={textObj.get("textAlign") === "center"}
            onClick={() => updateTextProp("textAlign", "center")}
          />
          <FormatButton
            icon={<AlignRight size={16} />}
            isActive={textObj.get("textAlign") === "right"}
            onClick={() => updateTextProp("textAlign", "right")}
          />
        </div>
        <div className="h-6 w-[1px] bg-white/[0.1]"></div>
        <div className="flex gap-1">
          <FormatButton
            icon={<Bold size={16} />}
            isActive={textObj.get("fontWeight") === "bold"}
            onClick={() =>
              updateTextProp(
                "fontWeight",
                textObj.get("fontWeight") === "bold" ? "normal" : "bold"
              )
            }
          />
          <FormatButton
            icon={<Italic size={16} />}
            isActive={textObj.get("fontStyle") === "italic"}
            onClick={() =>
              updateTextProp(
                "fontStyle",
                textObj.get("fontStyle") === "italic" ? "normal" : "italic"
              )
            }
          />
        </div>
      </div>

      {/* SLIDERS */}
      <div className="space-y-5">
        <AppleSlider
          label="Size"
          value={fontSize}
          min={10}
          max={200}
          onChange={(v) => updateTextProp("fontSize", v)}
        />
        <AppleSlider
          label="Letter Spacing"
          value={charSpacing}
          min={-100}
          max={800}
          onChange={(v) => updateTextProp("charSpacing", v)}
        />
        <AppleSlider
          label="Line Height"
          value={lineHeight}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(v) => updateTextProp("lineHeight", v)}
        />
      </div>

      {/* DELETE BUTTON */}
      <div className="border-t border-white/[0.08] pt-4">
        <button
          onClick={deleteActiveObject}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-[13px] font-medium text-red-500 transition-all hover:bg-red-500/20 active:scale-95"
        >
          <Trash2 size={16} />
          Delete Element
        </button>
      </div>
    </div>
  )
}

function FormatButton({
  icon,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-2 transition-all ${isActive ? "bg-white text-black" : "text-white/60 hover:bg-white/[0.08] hover:text-white"}`}
    >
      {icon}
    </button>
  )
}

function AppleSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: AppleSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[12px] font-medium text-white/60">
        <span>{label}</span>
        <span className="text-white/40 tabular-nums">
          {value.toFixed(step < 1 ? 1 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.1] outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,0,0,0.5)]"
      />
    </div>
  )
}
