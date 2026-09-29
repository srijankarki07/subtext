"use client"

import { useReducer } from "react"
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

import {
  AlignmentButton,
  AppleSlider,
  ColorCircle,
  FormatButton,
  PresetButton,
} from "@/components/functions"
import { Button } from "@/components/ui/button"
import { ColorPopover } from "@/components/ui/color-popover"
import { Section } from "@/components/ui/section"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * Typography inspector.
 *
 * Grouped into sections separated by headings and rules rather than a card
 * around every control, which is what made this panel read as a wall of boxes.
 * Every value, range and store call is unchanged.
 */

function EyedropperButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-[var(--text-secondary)] outline-none transition-colors hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    >
      <Pipette size={12} aria-hidden="true" />
      Pick
    </button>
  )
}

/** A label + colour trigger row, used for fill, outline and shadow colour. */
function ColorRow({
  label,
  value,
  onChange,
  pickLabel,
  onPick,
  pickTarget,
}: {
  label: string
  value: string
  onChange: (color: string) => void
  pickLabel: string
  onPick: (target: "fill" | "stroke" | "shadow") => void
  pickTarget: "fill" | "stroke" | "shadow"
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-1">
        <EyedropperButton
          label={pickLabel}
          onClick={() => onPick(pickTarget)}
        />
        <ColorPopover
          value={value}
          onChange={onChange}
          label={label}
          trigger={
            <ColorCircle
              color={value}
              aria-label={`${label}. Current colour ${value}.`}
            />
          }
        />
      </div>
    </div>
  )
}

export default function TextPanel() {
  const canvas = useEditorStore((s) => s.canvas)
  const activeObject = useEditorStore((s) => s.activeObject)
  const deleteActiveObject = useEditorStore((s) => s.deleteActiveObject)
  const applyTextStyle = useEditorStore((s) => s.applyTextStyle)
  const getActiveSelectionStyle = useEditorStore((s) => s.getActiveSelectionStyle)
  const alignObjectToCanvas = useEditorStore((s) => s.alignObjectToCanvas)
  const pickColor = useEditorStore((s) => s.pickColor)

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  if (!activeObject || activeObject.type !== "i-text") {
    return (
      <p className="text-[12px] text-[var(--text-muted)]">
        Select a text layer to edit it.
      </p>
    )
  }

  const textObj = activeObject as IText

  // Read properties, falling back to the object's own values when there is no
  // partial selection.
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

  return (
    <div className="flex flex-col gap-6">
      <Section title="Alignment">
        <div className="grid grid-cols-6 gap-1 rounded-lg bg-subtle p-1">
          <AlignmentButton
            icon={<MoveLeft size={16} />}
            label="Align left"
            onClick={() => alignObjectToCanvas("left")}
          />
          <AlignmentButton
            icon={<AlignCenterHorizontal size={16} />}
            label="Align horizontal centre"
            onClick={() => alignObjectToCanvas("center-h")}
          />
          <AlignmentButton
            icon={<MoveRight size={16} />}
            label="Align right"
            onClick={() => alignObjectToCanvas("right")}
          />
          <AlignmentButton
            icon={<AlignStartVertical size={16} />}
            label="Align top"
            onClick={() => alignObjectToCanvas("top")}
          />
          <AlignmentButton
            icon={<AlignCenterVertical size={16} />}
            label="Align vertical centre"
            onClick={() => alignObjectToCanvas("center-v")}
          />
          <AlignmentButton
            icon={<AlignEndVertical size={16} />}
            label="Align bottom"
            onClick={() => alignObjectToCanvas("bottom")}
          />
        </div>
      </Section>

      <Section title="Text" description="Applies to a partial selection too.">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-subtle p-1">
          <div className="flex gap-0.5">
            <FormatButton
              icon={<AlignLeft size={16} />}
              label="Align text left"
              isActive={textObj.get("textAlign") === "left"}
              onClick={() => applyTextStyle("textAlign", "left")}
            />
            <FormatButton
              icon={<AlignCenter size={16} />}
              label="Align text centre"
              isActive={textObj.get("textAlign") === "center"}
              onClick={() => applyTextStyle("textAlign", "center")}
            />
            <FormatButton
              icon={<AlignRight size={16} />}
              label="Align text right"
              isActive={textObj.get("textAlign") === "right"}
              onClick={() => applyTextStyle("textAlign", "right")}
            />
          </div>

          <div className="h-5 w-px bg-border" />

          <div className="flex gap-0.5">
            <FormatButton
              icon={<Bold size={16} />}
              label="Bold"
              isActive={fontWeight >= 700}
              onClick={() =>
                applyTextStyle("fontWeight", fontWeight >= 700 ? 400 : 700)
              }
            />
            <FormatButton
              icon={<Italic size={16} />}
              label="Italic"
              isActive={isItalic}
              onClick={() =>
                applyTextStyle("fontStyle", isItalic ? "normal" : "italic")
              }
            />
            <FormatButton
              icon={<UnderlineIcon size={16} />}
              label="Underline"
              isActive={isUnderline}
              onClick={() => applyTextStyle("underline", !isUnderline)}
            />
            <FormatButton
              icon={<Strikethrough size={16} />}
              label="Strikethrough"
              isActive={isLinethrough}
              onClick={() => applyTextStyle("linethrough", !isLinethrough)}
            />
          </div>
        </div>

        <ColorRow
          label="Text colour"
          value={fill}
          onChange={(color) => applyTextStyle("fill", color)}
          pickLabel="Pick text colour from the image"
          onPick={pickColor}
          pickTarget="fill"
        />
      </Section>

      <Section title="Typography">
        <AppleSlider
          label="Size"
          value={fontSize}
          min={10}
          max={200}
          onChange={(value) => applyTextStyle("fontSize", value)}
        />
        <AppleSlider
          label="Weight"
          value={fontWeight}
          min={100}
          max={900}
          step={100}
          onChange={(value) => applyTextStyle("fontWeight", value)}
        />
        <AppleSlider
          label="Letter spacing"
          value={charSpacing}
          min={-100}
          max={800}
          onChange={(value) => applyTextStyle("charSpacing", value)}
        />
        <AppleSlider
          label="Line height"
          value={lineHeight}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(value) => applyTextStyle("lineHeight", value)}
        />
      </Section>

      <Section
        title="Outline"
        description="A thin outline is often the cheapest readability win."
      >
        <ColorRow
          label="Colour"
          value={strokeColor}
          onChange={(color) => applyTextStyle("stroke", color)}
          pickLabel="Pick outline colour from the image"
          onPick={pickColor}
          pickTarget="stroke"
        />
        <AppleSlider
          label="Width"
          value={strokeWidth}
          min={0}
          max={10}
          step={0.5}
          onChange={(value) => applyTextStyle("strokeWidth", value)}
        />
      </Section>

      <Section
        title="Shadow"
        description="Separates the text from a busy background."
      >
        <ColorRow
          label="Colour"
          value={shadowColor}
          onChange={(color) => updateShadow({ color })}
          pickLabel="Pick shadow colour from the image"
          onPick={pickColor}
          pickTarget="shadow"
        />

        <div className="flex gap-1.5">
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

        <AppleSlider
          label="Blur"
          value={shadowBlur}
          min={0}
          max={50}
          onChange={(value) => updateShadow({ blur: value })}
        />
        <AppleSlider
          label="Distance"
          value={shadowOffset}
          min={-20}
          max={50}
          onChange={(value) => updateShadow({ offsetX: value, offsetY: value })}
        />
      </Section>

      <Button
        variant="destructive"
        className="w-full"
        onClick={() => deleteActiveObject()}
      >
        <Trash2 size={15} />
        Delete layer
      </Button>
    </div>
  )
}
