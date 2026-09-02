"use client"

import { CINEMATIC_PRESETS } from "@/lib/filters"
import { useEditorStore } from "@/store/useEditorStore"
import { MonitorPlay, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react"
import { useState } from "react"
import { AppleSlider, ColorCircle, ColorPickerDropdown } from "../functions"

export default function EffectsPanel() {
  const {
    applyImageFilter,
    applyPreset,
    applyWarmth,
    applyDuotone,
    vignettes,
    addVignette,
    updateVignette,
    removeVignette,
    letterboxes,
    addLetterbox,
    removeLetterbox,
    setGrainIntensity,
    grainIntensity,
    blurZones,
    addBlurZone,
    updateBlurZone,
    removeBlurZone,
    setGradientOverlay,
    gradientOpacity,
    resetEffect,
  } = useEditorStore()

  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [warmth, setWarmth] = useState(0)

  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const [lightColor, setLightColor] = useState("#FF453A")
  const [darkColor, setDarkColor] = useState("#0A84FF")

  const handleDuotoneChange = (type: "light" | "dark", hex: string) => {
    if (type === "light") {
      setLightColor(hex)
      applyDuotone(hex, darkColor)
    }
    if (type === "dark") {
      setDarkColor(hex)
      applyDuotone(lightColor, hex)
    }
  }

  const handleReset = (
    category: "adjustments" | "cinematic" | "atmospherics" | "all"
  ) => {
    resetEffect(category)
    if (category === "adjustments") {
      setBrightness(0)
      setContrast(0)
      setSaturation(0)
      setWarmth(0)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-1 pb-24">
      {/* 1. CINEMATIC PRESETS */}
      <div className="space-y-3 border-b border-white/[0.08] pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
              LUT Presets
            </h3>
            <Sparkles size={11} className="text-[#D6B47A]/70" />
          </div>
          <button
            onClick={() => handleReset("cinematic")}
            className="text-white/30 transition-colors hover:text-white"
          >
            <RotateCcw size={12} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(CINEMATIC_PRESETS).map(([name, matrix]) => (
            <button
              key={name}
              onClick={() => applyPreset(matrix)}
              className="cursor-pointer rounded-lg border border-white/[0.05] bg-white/[0.03] py-2 text-[10px] font-medium text-white/70 transition-all hover:bg-white/[0.1] hover:text-white active:scale-95"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. BASE ADJUSTMENTS */}
      <div className="space-y-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
            Adjustments
          </h3>
          <button
            onClick={() => handleReset("adjustments")}
            className="text-white/30 transition-colors hover:text-white"
          >
            <RotateCcw size={12} />
          </button>
        </div>
        <AppleSlider
          label="Brightness"
          min={-1}
          max={1}
          step={0.05}
          value={brightness}
          onChange={(v) => {
            setBrightness(v)
            applyImageFilter("Brightness", { brightness: v })
          }}
        />
        <AppleSlider
          label="Contrast"
          min={-1}
          max={1}
          step={0.05}
          value={contrast}
          onChange={(v) => {
            setContrast(v)
            applyImageFilter("Contrast", { contrast: v })
          }}
        />
        <AppleSlider
          label="Saturation"
          min={-1}
          max={1}
          step={0.05}
          value={saturation}
          onChange={(v) => {
            setSaturation(v)
            applyImageFilter("Saturation", { saturation: v })
          }}
        />
        <AppleSlider
          label="Warmth"
          min={-100}
          max={100}
          step={1}
          value={warmth}
          onChange={(v) => {
            setWarmth(v)
            applyWarmth(v)
          }}
        />
      </div>

      {/* 3. ATMOSPHERICS (Generators) */}
      <div className="space-y-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
            Atmospherics
          </h3>
          <button
            onClick={() => handleReset("atmospherics")}
            className="text-white/30 transition-colors hover:text-white"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Dynamic Vignette List */}
        {vignettes.map((v) => (
          <div
            key={v.id}
            className="relative space-y-3 rounded-xl border border-white/[0.1] bg-white/[0.03] p-3"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-white/80">
              <span className="flex items-center gap-2">
                Vignette{" "}
                <ColorCircle
                  color={v.color}
                  onClick={() =>
                    setOpenPicker(openPicker === v.id ? null : v.id)
                  }
                />
              </span>
              <div className="flex rounded-md bg-black/40 p-0.5">
                <button
                  onClick={() => updateVignette(v.id, { type: "radial" })}
                  className={`cursor-pointer rounded px-2 py-0.5 ${v.type === "radial" ? "bg-white/20 text-white" : "text-white/40"}`}
                >
                  Radial
                </button>
                <button
                  onClick={() => updateVignette(v.id, { type: "linear" })}
                  className={`cursor-pointer rounded px-2 py-0.5 ${v.type === "linear" ? "bg-white/20 text-white" : "text-white/40"}`}
                >
                  Linear
                </button>
              </div>
            </div>
            <ColorPickerDropdown
              isOpen={openPicker === v.id}
              currentColor={v.color}
              onChange={(hex) => updateVignette(v.id, { color: hex })}
            />
            <AppleSlider
              label="Intensity"
              min={0}
              max={100}
              value={v.opacity}
              onChange={(val) => updateVignette(v.id, { opacity: val })}
            />
            <button
              onClick={() => removeVignette(v.id)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] text-red-400/80 transition-colors hover:bg-red-500/10"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        ))}

        <button
          onClick={addVignette}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] py-2 text-[11px] text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
        >
          <Plus size={14} /> Add Vignette Layer
        </button>

        <AppleSlider
          label="Film Grain"
          min={0}
          max={100}
          value={grainIntensity}
          onChange={setGrainIntensity}
        />
        <AppleSlider
          label="Shadow Gradient"
          min={0}
          max={100}
          value={gradientOpacity}
          onChange={(v) =>
            setGradientOverlay(v, "linear", "transparent", "rgba(0,0,0,0.9)")
          }
        />
      </div>

      {/* 4. DUOTONE EFFECT */}
      <div className="space-y-4 border-b border-white/[0.08] pb-6">
        <div>
          <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
            Duotone mapping
          </h3>
          <p className="mt-1 text-[10px] text-white/30">
            Replaces highlights and shadows with selected colors.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative flex-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] text-white/60">
              <span>Highlights</span>
              <ColorCircle
                color={lightColor}
                onClick={() =>
                  setOpenPicker(openPicker === "light" ? null : "light")
                }
              />
            </div>
            <ColorPickerDropdown
              isOpen={openPicker === "light"}
              currentColor={lightColor}
              onChange={(hex) => handleDuotoneChange("light", hex)}
            />
          </div>
          <div className="relative flex-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] text-white/60">
              <span>Shadows</span>
              <ColorCircle
                color={darkColor}
                onClick={() =>
                  setOpenPicker(openPicker === "dark" ? null : "dark")
                }
              />
            </div>
            <ColorPickerDropdown
              isOpen={openPicker === "dark"}
              currentColor={darkColor}
              onChange={(hex) => handleDuotoneChange("dark", hex)}
            />
          </div>
        </div>
      </div>

      {/* 5. CINEMATIC UTILITIES */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
          Director Tools
        </h3>

        {/* Letterbox Generator */}
        <div className="space-y-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between pb-2 text-[12px] font-medium text-white/80">
            <span className="flex items-center gap-2">
              <MonitorPlay size={14} /> Widescreen Bars
            </span>
          </div>

          {letterboxes.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-lg bg-white/[0.04] p-2"
            >
              <span className="text-[10px] text-white/50">
                Draggable on canvas
              </span>
              <button
                onClick={() => removeLetterbox(l.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-3 gap-1 pt-1">
            <button
              onClick={() => addLetterbox(10)}
              className="rounded bg-white/[0.05] py-1.5 text-[10px] text-white/70 transition-colors hover:bg-white/[0.1]"
            >
              Thin
            </button>
            <button
              onClick={() => addLetterbox(15)}
              className="rounded bg-white/[0.05] py-1.5 text-[10px] text-white/70 transition-colors hover:bg-white/[0.1]"
            >
              Medium
            </button>
            <button
              onClick={() => addLetterbox(20)}
              className="rounded bg-white/[0.05] py-1.5 text-[10px] text-white/70 transition-colors hover:bg-white/[0.1]"
            >
              Thick
            </button>
          </div>
        </div>

        {/* Dynamic Blur Zones */}
        <div className="space-y-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
          <span className="block text-[12px] font-medium text-white/80">
            Selective Blur Zones
          </span>
          {blurZones.map((b) => (
            <div
              key={b.id}
              className="relative space-y-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"
            >
              <AppleSlider
                label="Intensity"
                min={0}
                max={100}
                value={b.opacity}
                onChange={(val) => updateBlurZone(b.id, val)}
              />
              <button
                onClick={() => removeBlurZone(b.id)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] text-red-400/80 transition-colors hover:bg-red-500/10"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ))}
          <button
            onClick={addBlurZone}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] py-2 text-[11px] text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
          >
            <Plus size={14} /> Add Blur Zone
          </button>
        </div>
      </div>

      {/* GLOBAL RESET */}
      <div className="border-t border-white/[0.08] pt-2">
        <button
          onClick={() => handleReset("all")}
          className="w-full cursor-pointer py-3 text-center text-[11px] font-medium text-red-400 transition-colors hover:text-red-300"
        >
          Clear All Effects
        </button>
      </div>
    </div>
  )
}
