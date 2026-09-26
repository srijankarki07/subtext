"use client"

import { ImagePlus, Maximize, Minimize, RefreshCw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Section } from "@/components/ui/section"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * The Media tool's panel.
 *
 * It used to be the same list as the Text tool — three text blocks and a single
 * "Image" row — so the media tool offered one action. This is the media
 * workflow instead: bring a photo in, swap it without losing the layout, change
 * how it sits on the artboard, or take it out.
 */
export default function MediaPanel() {
  const addImage = useEditorStore((s) => s.addImage)
  const replaceImage = useEditorStore((s) => s.replaceImage)
  const canvas = useEditorStore((s) => s.canvas)
  const activeObject = useEditorStore((s) => s.activeObject)
  const fitImageToCanvas = useEditorStore((s) => s.fitImageToCanvas)
  const deleteActiveObject = useEditorStore((s) => s.deleteActiveObject)

  const photo = canvas
    ?.getObjects()
    .find((object) => object.type === "image" && !(object as never)["isEffect"])

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
      </Section>

      {photo && (
        <Section
          title="Placement"
          description="Fill crops to the artboard; fit shows the whole photo."
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

      <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
        Photos are read in the browser. Nothing is uploaded anywhere.
      </p>
    </div>
  )
}
