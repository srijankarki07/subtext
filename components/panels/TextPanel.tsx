"use client"

import { useEditorStore } from "@/store/useEditorStore"
import { IText, Shadow } from "fabric"
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  Bold,
  Italic,
  MoveLeft,
  MoveRight,
  Pipette,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react"
import { useReducer, useState } from "react"
import {
  AlignmentButton,
  AppleSlider,
  ColorCircle,
  ColorPickerDropdown,
  FormatButton,
  PresetButton,
} from "../functions"

export default function TextPanel() {
  const {
    canvas,
    activeObject,
    deleteActiveObject,
    applyTextStyle,
    getActiveSelectionStyle,
    alignObjectToCanvas,
    pickColor,
  } = useEditorStore()

  const [, forceUpdate] = useReducer((x) => x + 1, 0)
  const [openPicker, setOpenPicker] = useState<
    "fill" | "stroke" | "shadow" | null
  >(null)

  if (!activeObject || activeObject.type !== "i-text") {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-white/40">
        <p className="text-[13px]">Select a text layer to edit properties.</p>
      </div>
    )
  }

  const textObj = activeObject as IText

  // Read properties with partial-selection fallback
  const fontSize = getActiveSelectionStyle("fontSize") || 40
  const charSpacing = getActiveSelectionStyle("charSpacing") || 0
  const lineHeight = getActiveSelectionStyle("lineHeight") || 1.1
  const fill = getActiveSelectionStyle("fill") || "#ffffff"

  const rawWeight = getActiveSelectionStyle("fontWeight")
  const fontWeight =
    typeof rawWeight === "number"
      ? rawWeight
      : rawWeight === "bold"
        ? 700
        : parseInt(rawWeight as string) || 400
  const isItalic = getActiveSelectionStyle("fontStyle") === "italic"
  const isUnderline = !!getActiveSelectionStyle("underline")
  const isLinethrough = !!getActiveSelectionStyle("linethrough")

  const strokeWidth = getActiveSelectionStyle("strokeWidth") || 0
  const strokeColor = getActiveSelectionStyle("stroke") || "#000000"

  const currentShadow = textObj.get("shadow") as Shadow | null
  const shadowBlur = currentShadow?.blur || 0
  const shadowOffset = currentShadow?.offsetX || 0
  const shadowColor = currentShadow?.color || "rgba(0,0,0,0.8)"

  const updateShadow = (updates: Partial<Shadow>) => {
    if (!textObj || !canvas) return
    const baseShadow = currentShadow || {
      color: "rgba(0,0,0,0.8)",
      blur: 0,
      offsetX: 0,
      offsetY: 0,
    }
    textObj.set("shadow", new Shadow({ ...baseShadow, ...updates }))
    canvas.requestRenderAll()
    forceUpdate()
  }

  const clearShadow = () => {
    if (!textObj || !canvas) return
    textObj.set("shadow", null)
    canvas.requestRenderAll()
    forceUpdate()
  }

  const togglePicker = (picker: "fill" | "stroke" | "shadow") => {
    setOpenPicker(openPicker === picker ? null : picker)
  }

  return (
    <div className="flex flex-col gap-6 p-1 pb-24">
      {/* CANVAS ALIGNMENT */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
            Canvas Alignment
          </h3>
        </div>
        <div className="grid grid-cols-6 gap-1 rounded-xl border border-white/[0.05] bg-white/[0.04] p-1.5">
          <AlignmentButton
            icon={<MoveLeft size={16} />}
            onClick={() => alignObjectToCanvas("left")}
          />
          <AlignmentButton
            icon={<AlignCenterHorizontal size={16} />}
            onClick={() => alignObjectToCanvas("center-h")}
          />
          <AlignmentButton
            icon={<MoveRight size={16} />}
            onClick={() => alignObjectToCanvas("right")}
          />
          <AlignmentButton
            icon={<AlignStartVertical size={16} />}
            onClick={() => alignObjectToCanvas("top")}
          />
          <AlignmentButton
            icon={<AlignCenterVertical size={16} />}
            onClick={() => alignObjectToCanvas("center-v")}
          />
          <AlignmentButton
            icon={<AlignEndVertical size={16} />}
            onClick={() => alignObjectToCanvas("bottom")}
          />
        </div>
      </div>

      {/* TEXT ALIGNMENT & BASIC STYLE */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
            Formatting & Style
          </h3>
          <span className="text-[9px] text-[#D6B47A]/70">
            Partial select supported
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-1">
          <div className="flex gap-1">
            <FormatButton
              icon={<AlignLeft size={16} />}
              isActive={textObj.get("textAlign") === "left"}
              onClick={() => applyTextStyle("textAlign", "left")}
            />
            <FormatButton
              icon={<AlignCenter size={16} />}
              isActive={textObj.get("textAlign") === "center"}
              onClick={() => applyTextStyle("textAlign", "center")}
            />
            <FormatButton
              icon={<AlignRight size={16} />}
              isActive={textObj.get("textAlign") === "right"}
              onClick={() => applyTextStyle("textAlign", "right")}
            />
          </div>
          <div className="h-6 w-[1px] bg-white/[0.1]"></div>
          <div className="flex gap-1">
            <FormatButton
              icon={<Bold size={16} />}
              isActive={fontWeight >= 700}
              onClick={() =>
                applyTextStyle("fontWeight", fontWeight >= 700 ? 400 : 700)
              }
            />
            <FormatButton
              icon={<Italic size={16} />}
              isActive={isItalic}
              onClick={() =>
                applyTextStyle("fontStyle", isItalic ? "normal" : "italic")
              }
            />
            <FormatButton
              icon={<UnderlineIcon size={16} />}
              isActive={isUnderline}
              onClick={() => applyTextStyle("underline", !isUnderline)}
            />
            <FormatButton
              icon={<Strikethrough size={16} />}
              isActive={isLinethrough}
              onClick={() => applyTextStyle("linethrough", !isLinethrough)}
            />
          </div>
        </div>
      </div>

      {/* TEXT FILL COLOR */}
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between text-[12px] font-medium text-white/80">
          <span>Text Color</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => pickColor("fill")}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] text-white/70 transition-all hover:bg-white/[0.1] hover:text-white"
            >
              <Pipette size={12} />
              Pick
            </button>
            <ColorCircle color={fill} onClick={() => togglePicker("fill")} />
          </div>
        </div>
        <ColorPickerDropdown
          isOpen={openPicker === "fill"}
          currentColor={fill}
          onChange={(color) => applyTextStyle("fill", color)}
        />
      </div>

      {/* TYPOGRAPHY SLIDERS */}
      <div className="space-y-5">
        <AppleSlider
          label="Size"
          value={fontSize}
          min={10}
          max={200}
          onChange={(v) => applyTextStyle("fontSize", v)}
        />
        <AppleSlider
          label="Font Weight"
          value={fontWeight}
          min={100}
          max={900}
          step={100}
          onChange={(v) => applyTextStyle("fontWeight", v)}
        />
        <AppleSlider
          label="Letter Spacing"
          value={charSpacing}
          min={-100}
          max={800}
          onChange={(v) => applyTextStyle("charSpacing", v)}
        />
        <AppleSlider
          label="Line Height"
          value={lineHeight}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(v) => applyTextStyle("lineHeight", v)}
        />
      </div>

      {/* CINEMATIC EFFECTS SECTION */}
      <div className="space-y-6 border-t border-white/[0.08] pt-6">
        <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-white/50 uppercase">
          Cinematic Effects
        </h3>

        {/* Outline / Stroke */}
        <div className="space-y-4 rounded-sm border border-white/[0.05] bg-white/[0.02] p-3">
          <div className="relative">
            <div className="flex items-center justify-between text-[12px] font-medium text-white/80">
              <span>Outline Color</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => pickColor("stroke")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] text-white/70 transition-all hover:bg-white/[0.1] hover:text-white"
                >
                  <Pipette size={12} />
                  Pick
                </button>
                <ColorCircle
                  color={strokeColor}
                  onClick={() => togglePicker("stroke")}
                />
              </div>
            </div>
            <ColorPickerDropdown
              isOpen={openPicker === "stroke"}
              currentColor={strokeColor}
              onChange={(color) => applyTextStyle("stroke", color)}
            />
          </div>
          <AppleSlider
            label="Width"
            value={strokeWidth}
            min={0}
            max={10}
            step={0.5}
            onChange={(v) => applyTextStyle("strokeWidth", v)}
          />
        </div>

        {/* Drop Shadow & Glow */}
        <div className="space-y-4 rounded-sm border border-white/[0.05] bg-white/[0.02] p-3">
          <div className="relative">
            <div className="flex items-center justify-between text-[12px] font-medium text-white/80">
              <span>Shadow Color</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => pickColor("shadow")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] text-white/70 transition-all hover:bg-white/[0.1] hover:text-white"
                >
                  <Pipette size={12} />
                  Pick
                </button>
                <ColorCircle
                  color={shadowColor}
                  onClick={() => togglePicker("shadow")}
                />
              </div>
            </div>
            <ColorPickerDropdown
              isOpen={openPicker === "shadow"}
              currentColor={shadowColor}
              onChange={(color) => updateShadow({ color })}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <PresetButton
              label="Soft"
              onClick={() =>
                updateShadow({
                  blur: 15,
                  offsetX: 4,
                  offsetY: 4,
                  color:
                    shadowColor === "rgba(0,0,0,0.8)"
                      ? "rgba(0,0,0,0.6)"
                      : shadowColor,
                })
              }
            />
            <PresetButton
              label="Hard"
              onClick={() => updateShadow({ blur: 0, offsetX: 5, offsetY: 5 })}
            />
            <PresetButton
              label="Glow"
              onClick={() => updateShadow({ blur: 25, offsetX: 0, offsetY: 0 })}
            />
            <PresetButton label="Off" onClick={clearShadow} isDanger />
          </div>

          <div className="space-y-3 pt-2">
            <AppleSlider
              label="Blur"
              value={shadowBlur}
              min={0}
              max={50}
              onChange={(v) => updateShadow({ blur: v })}
            />
            <AppleSlider
              label="Distance"
              value={shadowOffset}
              min={-20}
              max={50}
              onChange={(v) => updateShadow({ offsetX: v, offsetY: v })}
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={() => deleteActiveObject()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-[13px] font-medium text-red-500 transition-all hover:bg-red-500/20 active:scale-95"
        >
          <Trash2 size={16} />
          Delete Element
        </button>
      </div>
    </div>
  )
}
