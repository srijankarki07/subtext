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
