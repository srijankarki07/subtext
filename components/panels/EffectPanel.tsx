"use client"

import { useState } from "react"
import { HelpCircle, MonitorPlay, Plus, RotateCcw, Trash2 } from "lucide-react"

import { AppleSlider, ColorCircle } from "@/components/functions"
import { Button } from "@/components/ui/button"
import { ColorPopover } from "@/components/ui/color-popover"
import { IconButton } from "@/components/ui/icon-button"
import { Section } from "@/components/ui/section"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Tooltip } from "@/components/ui/tooltip"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * Cinema / image treatment.
 *
 * Grouped into: adjustments, atmosphere and texture, duotone, framing. The
 * radial/linear switches now use the shared SegmentedControl instead of two
 * hand-rolled copies, and the inline "?" hints are real tooltips that open on
 * keyboard focus rather than `title` attributes on a span.
 */

function InfoHint({ label }: { label: string }) {
  return (
    <Tooltip label={label} side="top">
      <button
        type="button"
        aria-label={label}
        className="cursor-help rounded-full text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        <HelpCircle size={12} aria-hidden="true" />
      </button>
    </Tooltip>
  )
}

export default function EffectsPanel() {
  const applyImageFilter = useEditorStore((s) => s.applyImageFilter)
  const applyWarmth = useEditorStore((s) => s.applyWarmth)
  const applyDuotone = useEditorStore((s) => s.applyDuotone)
  const vignettes = useEditorStore((s) => s.vignettes)
  const addVignette = useEditorStore((s) => s.addVignette)
  const updateVignette = useEditorStore((s) => s.updateVignette)
  const removeVignette = useEditorStore((s) => s.removeVignette)
  const letterboxes = useEditorStore((s) => s.letterboxes)
  const addLetterbox = useEditorStore((s) => s.addLetterbox)
  const removeLetterbox = useEditorStore((s) => s.removeLetterbox)
  const grainIntensity = useEditorStore((s) => s.grainIntensity)
  const setGrainIntensity = useEditorStore((s) => s.setGrainIntensity)
  const blurZones = useEditorStore((s) => s.blurZones)
  const addBlurZone = useEditorStore((s) => s.addBlurZone)
  const updateBlurZone = useEditorStore((s) => s.updateBlurZone)
  const removeBlurZone = useEditorStore((s) => s.removeBlurZone)
  const setGradientOverlay = useEditorStore((s) => s.setGradientOverlay)
  const gradientOpacity = useEditorStore((s) => s.gradientOpacity)
  const resetEffect = useEditorStore((s) => s.resetEffect)

  // NOTE: these four live in local state, so they reset to 0 when this panel
  // unmounts (switching tools) while the image keeps its filters — the readout
  // then disagrees with the image. Moving them into EffectSlice is the fix and
  // is scheduled with the rest of the grade-state work.
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [warmth, setWarmth] = useState(0)

  const [lightColor, setLightColor] = useState("#FF453A")
  const [darkColor, setDarkColor] = useState("#0A84FF")

  const handleDuotoneChange = (type: "light" | "dark", hex: string) => {
    if (type === "light") {
      setLightColor(hex)
      applyDuotone(hex, darkColor)
    } else {
      setDarkColor(hex)
      applyDuotone(lightColor, hex)
    }
  }

  const handleReset = (category: "adjustments" | "atmospherics") => {
    resetEffect(category)
    if (category === "adjustments") {
      setBrightness(0)
      setContrast(0)
      setSaturation(0)
      setWarmth(0)
    }
  }

  const dashedButton =
    "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-edge-strong py-2 text-[12px] text-[var(--text-secondary)] outline-none transition-colors hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Adjustments"
        action={
          <IconButton
            icon={<RotateCcw size={13} />}
            label="Reset adjustments"
            size="sm"
            onClick={() => handleReset("adjustments")}
          />
        }
      >
        <AppleSlider
          label="Brightness"
          min={-1}
          max={1}
          step={0.05}
          value={brightness}
          onChange={(value) => {
            setBrightness(value)
            applyImageFilter("Brightness", { brightness: value })
          }}
        />
        <AppleSlider
          label="Contrast"
          min={-1}
          max={1}
          step={0.05}
          value={contrast}
          onChange={(value) => {
            setContrast(value)
            applyImageFilter("Contrast", { contrast: value })
          }}
        />
        <AppleSlider
          label="Saturation"
          min={-1}
          max={1}
          step={0.05}
          value={saturation}
          onChange={(value) => {
            setSaturation(value)
            applyImageFilter("Saturation", { saturation: value })
          }}
        />
        <AppleSlider
          label="Warmth"
          min={-100}
          max={100}
          value={warmth}
          onChange={(value) => {
            setWarmth(value)
            applyWarmth(value)
          }}
        />
      </Section>

      <Section
        title="Atmosphere and texture"
        action={
          <IconButton
            icon={<RotateCcw size={13} />}
            label="Reset atmosphere and texture"
            size="sm"
            onClick={() => handleReset("atmospherics")}
          />
        }
      >
        {vignettes.map((vignette) => (
          <div
            key={vignette.id}
            className="flex flex-col gap-3 rounded-lg border border-border p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                Vignette
                <ColorPopover
                  value={vignette.color}
                  onChange={(hex) => updateVignette(vignette.id, { color: hex })}
                  label="Vignette colour"
                  align="start"
                  trigger={
                    <ColorCircle
                      color={vignette.color}
                      aria-label={`Vignette colour. Current ${vignette.color}.`}
                    />
                  }
                />
              </span>
              <SegmentedControl
                label="Vignette type"
                size="sm"
                value={vignette.type}
                onChange={(type) => updateVignette(vignette.id, { type })}
                options={[
                  { value: "radial", label: "Radial" },
                  { value: "linear", label: "Linear" },
                ]}
              />
            </div>

            <AppleSlider
              label="Intensity"
              min={0}
              max={100}
              value={vignette.opacity}
              onChange={(value) =>
                updateVignette(vignette.id, { opacity: value })
              }
            />

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => removeVignette(vignette.id)}
            >
              <Trash2 size={13} />
              Remove vignette
            </Button>
          </div>
        ))}

        <button type="button" onClick={() => addVignette()} className={dashedButton}>
          <Plus size={14} aria-hidden="true" /> Add vignette layer
        </button>

        <AppleSlider
          label="Film grain"
          min={0}
          max={100}
          value={grainIntensity}
          onChange={setGrainIntensity}
        />
        <AppleSlider
          label="Shadow gradient"
          min={0}
          max={100}
          value={gradientOpacity}
          onChange={(value) =>
            setGradientOverlay(value, "linear", "transparent", "rgba(0,0,0,0.9)")
          }
        />
      </Section>

      <Section
        title="Duotone"
        description="Maps image luminance between two colours."
        action={
          <InfoHint label="Lighter tones become Highlights, darker tones become Shadows." />
        }
      >
        <div className="flex gap-2">
          {(
            [
              { key: "light" as const, label: "Highlights", color: lightColor },
              { key: "dark" as const, label: "Shadows", color: darkColor },
            ] as const
          ).map(({ key, label, color }) => (
            <div
              key={key}
              className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-border p-2"
            >
              <span className="text-[12px] text-[var(--text-secondary)]">
                {label}
              </span>
              <ColorPopover
                value={color}
                onChange={(hex) => handleDuotoneChange(key, hex)}
                label={`${label} colour`}
                align="start"
                trigger={
                  <ColorCircle
                    color={color}
                    aria-label={`${label} colour. Current ${color}.`}
                  />
                }
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Framing"
        action={
          <InfoHint label="Widescreen bars crop top and bottom. Blur zones blur behind text to boost readability." />
        }
      >
        <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
          <span className="flex items-center gap-2 text-[12px] font-medium text-foreground">
            <MonitorPlay size={14} aria-hidden="true" /> Widescreen letterbox
          </span>

          {letterboxes.map((letterbox) => (
            <div
              key={letterbox.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-subtle px-2 py-1.5"
            >
              <span className="text-[11px] text-[var(--text-muted)]">
                Draggable bars on the artboard
              </span>
              <IconButton
                icon={<Trash2 size={13} />}
                label="Remove letterbox bars"
                size="sm"
                tone="danger"
                onClick={() => removeLetterbox(letterbox.id)}
              />
            </div>
          ))}

          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { ratio: 10, label: "10% Thin" },
                { ratio: 15, label: "15% Cinema" },
                { ratio: 20, label: "20% Heavy" },
              ] as const
            ).map(({ ratio, label }) => (
              <Button
                key={ratio}
                variant="secondary"
                size="sm"
                onClick={() => addLetterbox(ratio)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-2.5">
          <span className="flex items-center justify-between gap-2 text-[12px] font-medium text-foreground">
            Selective blur zone
            <span className="text-[11px] font-normal text-[var(--text-muted)]">
              Draggable mask
            </span>
          </span>

          {blurZones.map((zone) => (
            <div
              key={zone.id}
              className="flex flex-col gap-3 rounded-lg bg-subtle p-2.5"
            >
              <AppleSlider
                label="Blur radius"
                min={0}
                max={100}
                value={zone.opacity}
                onChange={(value) => updateBlurZone(zone.id, value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => removeBlurZone(zone.id)}
              >
                <Trash2 size={13} />
                Remove blur zone
              </Button>
            </div>
          ))}

          <button type="button" onClick={addBlurZone} className={dashedButton}>
            <Plus size={14} aria-hidden="true" /> Add selective blur box
          </button>
        </div>
      </Section>

      <Button
        variant="destructive"
        className="w-full"
        onClick={() => handleReset("atmospherics")}
      >
        Reset atmosphere and layers
      </Button>
    </div>
  )
}
