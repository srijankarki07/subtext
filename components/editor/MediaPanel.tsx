"use client"

import {
  Ban,
  Crop,
  ImagePlus,
  Maximize,
  Minimize,
  RefreshCw,
  Trash2,
} from "lucide-react"

import { BackgroundRemovalButton } from "@/components/editor/BackgroundRemovalButton"

import { Button } from "@/components/ui/button"
import { Section } from "@/components/ui/section"
import {
  BACKGROUND_PRESETS,
  getBackgroundPreset,
  previewStyle,
} from "@/lib/backgrounds"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * The Media tool's panel.
 *
 * It used to be the same list as the Text tool - three text blocks and a single
 * "Image" row - so the media tool offered one action. This is the media
 * workflow instead: bring a photo in, swap it without losing the layout, change
 * how it sits on the artboard, or take it out.
 */
export default function MediaPanel() {
  const addImage = useEditorStore((s) => s.addImage)
  const replaceImage = useEditorStore((s) => s.replaceImage)
  const canvas = useEditorStore((s) => s.canvas)
  const activeObject = useEditorStore((s) => s.activeObject)
  const fitImageToCanvas = useEditorStore((s) => s.fitImageToCanvas)
  const smartCrop = useEditorStore((s) => s.smartCrop)
  const deleteActiveObject = useEditorStore((s) => s.deleteActiveObject)
  const backgroundPreset = useEditorStore((s) => s.backgroundPreset)
  const applyBackground = useEditorStore((s) => s.applyBackground)
  const activeBackground = getBackgroundPreset(backgroundPreset)

  // The selected image wins, so Replace and Remove background act on the layer
  // the user is looking at; otherwise the primary photo.
  const photo =
    activeObject?.type === "image"
      ? activeObject
      : canvas
          ?.getObjects()
          .find(
            (object) =>
              object.type === "image" && !(object as never)["isEffect"]
          )

  const selectedIsPhoto = activeObject?.type === "image"

  return (
    <div className="flex flex-col gap-6">
      <Section
        title={photo ? "Photo" : "Add a photo"}
        description={
          photo
            ? "Replace keeps the layout, the grade and any blur zones."
            : "Drop a photo on the artboard, or choose a file."
        }
      >
        <Button
          variant={photo ? "outline" : "default"}
          className="w-full"
          onClick={() => void addImage()}
        >
          <ImagePlus size={14} aria-hidden="true" />
          {photo ? "Add another photo" : "Upload photo"}
        </Button>

        {photo && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void replaceImage()}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Replace the photo
          </Button>
        )}

        {photo && <BackgroundRemovalButton target={photo} />}
      </Section>

      {photo && (
        <Section
          title="Placement"
          description="Fill crops to the artboard, fit shows the whole photo, and frame keeps the busiest crop."
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!selectedIsPhoto) {
                  canvas?.setActiveObject(photo)
                  canvas?.requestRenderAll()
                  useEditorStore.getState().setActiveObject(photo)
                }
                fitImageToCanvas("fill")
              }}
              className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border bg-card py-3 text-[var(--text-secondary)] transition-colors outline-none hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.98]"
            >
              <Maximize size={16} aria-hidden="true" />
              <span className="text-[12px] font-medium">Fill</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedIsPhoto) {
                  canvas?.setActiveObject(photo)
                  canvas?.requestRenderAll()
                  useEditorStore.getState().setActiveObject(photo)
                }
                fitImageToCanvas("fit")
              }}
              className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border bg-card py-3 text-[var(--text-secondary)] transition-colors outline-none hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.98]"
            >
              <Minimize size={16} aria-hidden="true" />
              <span className="text-[12px] font-medium">Fit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedIsPhoto) {
                  canvas?.setActiveObject(photo)
                  canvas?.requestRenderAll()
                  useEditorStore.getState().setActiveObject(photo)
                }
                smartCrop()
              }}
              aria-label="Smart crop the photo"
              title="Frame the most detailed crop"
              className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border bg-card py-3 text-[var(--text-secondary)] transition-colors outline-none hover:bg-subtle-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:scale-[0.98]"
            >
              <Crop size={16} aria-hidden="true" />
              <span className="text-[12px] font-medium">Frame</span>
            </button>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => deleteActiveObject(photo)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Remove the photo
          </Button>
        </Section>
      )}

      <Section
        title="Background"
        description="A real layer behind the photo. Gives a cutout something to sit on."
      >
        <div className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            onClick={() => applyBackground(null)}
            aria-label="Clear the background"
            aria-pressed={backgroundPreset === null}
            title="No background"
            className={cn(
              "flex h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-[var(--text-muted)] transition-all outline-none",
              "hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              backgroundPreset === null
                ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                : "opacity-80 hover:opacity-100"
            )}
          >
            <Ban size={14} aria-hidden="true" />
          </button>

          {BACKGROUND_PRESETS.map((preset) => {
            const active = backgroundPreset === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyBackground(preset.id)}
                aria-label={`Apply the ${preset.name} background`}
                aria-pressed={active}
                title={preset.name}
                style={previewStyle(preset)}
                className={cn(
                  "h-9 cursor-pointer rounded-md border border-border/60 transition-all outline-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  active
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                    : "opacity-80 hover:opacity-100"
                )}
              />
            )
          })}
        </div>

        <p className="text-[11px] text-[var(--text-muted)]">
          {activeBackground ? activeBackground.name : "Transparent"}
        </p>
      </Section>

      <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
        Photos are read in the browser. Nothing is uploaded anywhere.
      </p>
    </div>
  )
}
