import { FabricImage, type Canvas } from "fabric"

import { extractPalette } from "@/lib/colorUtils"

/**
 * Importing an image onto the artboard.
 *
 * There used to be two implementations that had quietly drifted apart:
 * `Canvas.processFile` (used by drag-and-drop and the empty state) checked the
 * MIME type and extracted the colour palette, while `createCoreSlice.addImage`
 * (used by the tool rail's Media action and the inspector's add menu) did
 * neither. So uploading through the toolbar produced no palette at all and the
 * colour panel reported "add an image to extract its colours" directly after
 * the user had added one.
 *
 * This is now the single path, and it always extracts.
 */

/** Images are scaled to this fraction of the artboard, leaving a margin. */
const FIT_RATIO = 0.9

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"))
    reader.readAsDataURL(file)
  })
}

export interface ImportedImage {
  image: FabricImage
  /** Colours extracted from the image, for the palette and contrast engine. */
  palette: string[]
}

/**
 * Loads `file`, scales it to sit comfortably on the artboard, inserts it behind
 * everything else, and extracts its palette.
 *
 * The palette is returned rather than written to the store so this stays a
 * plain function; callers decide where it goes.
 */
export async function importImage(
  canvas: Canvas,
  file: File,
  { colorCount = 6 }: { colorCount?: number } = {}
): Promise<ImportedImage | null> {
  if (!isImageFile(file)) return null

  const dataUrl = await readAsDataUrl(file)
  const image = await FabricImage.fromURL(dataUrl)

  const scale = Math.min(
    canvas.getWidth() / (image.width || 1),
    canvas.getHeight() / (image.height || 1)
  )
  image.scale(scale * FIT_RATIO)
  canvas.centerObject(image)

  // Index 0 so the artwork sits behind any text already on the canvas.
  canvas.insertAt(0, image)
  canvas.setActiveObject(image)

  const palette = await extractPalette(dataUrl, colorCount)

  return { image, palette }
}

/** Opens the OS file picker and resolves with the chosen file, if any. */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

/**
 * Swaps the artwork's photo for another, keeping the composition.
 *
 * The transform is not copied verbatim: a 4000px replacement at the previous
 * scale would render four times larger and destroy the layout. The new photo is
 * scaled to fit the footprint the old one occupied, which is what "replace the
 * picture, keep the design" has to mean.
 *
 * Selective-blur overlays are clones of the photo, so they are repointed at the
 * new image too — otherwise the blurred region would keep showing the photo the
 * user just replaced.
 */
export async function replaceImage(
  canvas: Canvas,
  file: File,
  { colorCount = 6 }: { colorCount?: number } = {}
): Promise<{ palette: string[] } | null> {
  if (!isImageFile(file)) return null

  const previous = canvas
    .getObjects()
    .find((object) => object.type === "image" && !(object as any).isEffect) as
    | FabricImage
    | undefined

  // Nothing to replace: treat it as a first upload.
  if (!previous) {
    const added = await importImage(canvas, file, { colorCount })
    return added ? { palette: added.palette } : null
  }

  const dataUrl = await readAsDataUrl(file)
  const next = await FabricImage.fromURL(dataUrl)

  const footprintWidth = previous.getScaledWidth()
  const footprintHeight = previous.getScaledHeight()
  const scale = Math.min(
    footprintWidth / (next.width || 1),
    footprintHeight / (next.height || 1)
  )

  next.set({
    left: previous.left,
    top: previous.top,
    originX: previous.originX,
    originY: previous.originY,
    angle: previous.angle,
    flipX: previous.flipX,
    flipY: previous.flipY,
    opacity: previous.opacity,
    scaleX: scale,
    scaleY: scale,
    // The grade belongs to the composition, not to the photo.
    filters: [...(previous.filters ?? [])],
    selectable: previous.selectable,
    evented: previous.evented,
    lockMovementX: previous.lockMovementX,
    lockMovementY: previous.lockMovementY,
    lockScalingX: previous.lockScalingX,
    lockScalingY: previous.lockScalingY,
  })

  const index = canvas.getObjects().indexOf(previous)
  canvas.remove(previous)
  canvas.insertAt(Math.max(0, index), next)
  canvas.setActiveObject(next)

  canvas
    .getObjects()
    .filter((object: any) => typeof object.id === "string" && object.id.startsWith("blur-overlay-"))
    .forEach((overlay: any) => {
      overlay.setElement(next.getElement())
      overlay.set({ scaleX: scale, scaleY: scale })
    })

  if ((next.filters ?? []).length > 0) await next.applyFilters()

  const palette = await extractPalette(dataUrl, colorCount)
  return { palette }
}
