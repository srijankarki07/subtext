import { env, pipeline, type RawImage } from "@huggingface/transformers"

import { erodeAlpha, smoothAlpha } from "./cutoutMath"

/**
 * Background removal, off the main thread.
 *
 * The WASM backend runs on whatever thread it is started on, and inference
 * takes seconds - on the main thread that is a frozen page. Everything here is
 * therefore in a worker: the model load, the inference and the PNG encode.
 *
 * Two Apache-2.0 models, both self-hosted under `/models`, so no image leaves
 * the origin:
 *
 * - `person`  MODNet (6.6 MB q8), trimap-free portrait matting.
 * - `object`  U-2-Netp (4.4 MB fp32), general saliency for products and scenes.
 *   Transformers.js does not register the U-2-Net architecture, so this one is
 *   driven directly through ONNX Runtime Web - the same runtime the pipeline
 *   uses, pinned to the same version.
 */

type WorkerScope = {
  postMessage: (message: unknown) => void
  onmessage: ((event: MessageEvent) => void) | null
}

const worker = self as unknown as WorkerScope

type Mode = "person" | "object"
type StartMessage = { type: "start"; blob: Blob; mode: Mode }
type Segmenter = (input: Blob) => Promise<RawImage | RawImage[]>

/** Must match the `onnxruntime-web` dependency, or its WASM will be fetched twice. */
const ORT_VERSION = "1.31.0-dev.20260914-8d85527a0"
const ORT_WASM_PATH = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`

// U-2-Netp's processor settings, from `preprocessor_config.json`.
const U2NET_SIZE = 320
const U2NET_MEAN = [0.485, 0.456, 0.406]
const U2NET_STD = [0.229, 0.224, 0.225]

let segmenter: Segmenter | null = null
let u2net: {
  session: import("onnxruntime-web").InferenceSession
  ort: typeof import("onnxruntime-web")
} | null = null

// --- MODNet ----------------------------------------------------------------

async function loadSegmenter(): Promise<Segmenter> {
  if (segmenter) return segmenter

  env.allowRemoteModels = false
  env.allowLocalModels = true
  env.localModelPath = "/models/"
  // No cross-origin isolation in this app, so SharedArrayBuffer threads are
  // unavailable; the single-threaded WASM backend is the portable choice.
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1
  }

  segmenter = (await pipeline("background-removal", "modnet", {
    dtype: "q8",
    device: "wasm",
    progress_callback: (event: unknown) => {
      const progress = (event as { progress?: number }).progress ?? 0
      worker.postMessage({
        type: "progress",
        status: "loading",
        progress: Math.max(0, Math.min(100, Math.round(progress))),
      })
    },
  })) as unknown as Segmenter

  return segmenter
}

function upscale(mat: OffscreenCanvas, bitmap: ImageBitmap): OffscreenCanvas {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not create a drawing surface.")
  context.imageSmoothingQuality = "high"
  context.drawImage(mat, 0, 0, bitmap.width, bitmap.height)
  return canvas
}

function matteCanvas(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not create a drawing surface.")
  const image = new ImageData(width, height)
  image.data.set(pixels)
  context.putImageData(image, 0, 0)
  return canvas
}

async function cutoutPerson(blob: Blob, bitmap: ImageBitmap): Promise<Blob> {
  const model = await loadSegmenter()
  worker.postMessage({ type: "progress", status: "processing", progress: 0 })

  const result = await model(blob)
  const output = Array.isArray(result) ? result[0] : result
  if (!output) throw new Error("The model returned no image.")

  const { width, height, data, channels } = output

  if (channels === 4) {
    const pixels = new Uint8ClampedArray(data)
    for (let i = 3; i < pixels.length; i += 4) {
      pixels[i] = Math.round(smoothAlpha(pixels[i] / 255) * 255)
    }
    erodeAlpha(pixels, width, height, 4)
    return upscale(matteCanvas(pixels, width, height), bitmap).convertToBlob({
      type: "image/png",
    })
  }

  if (channels !== 1) throw new Error("Unexpected matte format.")

  // One-channel matte: composite it against the source's own pixels.
  const mask = new Uint8ClampedArray(data)
  for (let i = 0; i < mask.length; i++) {
    mask[i] = Math.round(smoothAlpha(mask[i] / 255) * 255)
  }
  erodeAlpha(mask, width, height, 1)

  const source = new OffscreenCanvas(width, height)
  const sourceContext = source.getContext("2d")
  if (!sourceContext) throw new Error("Could not create a drawing surface.")
  sourceContext.drawImage(bitmap, 0, 0, width, height)
  const original = sourceContext.getImageData(0, 0, width, height).data

  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
    pixels[j] = original[j]
    pixels[j + 1] = original[j + 1]
    pixels[j + 2] = original[j + 2]
    pixels[j + 3] = mask[i]
  }

  return upscale(matteCanvas(pixels, width, height), bitmap).convertToBlob({
    type: "image/png",
  })
}

// --- U-2-Netp --------------------------------------------------------------

async function loadU2Net(): Promise<NonNullable<typeof u2net>> {
  if (u2net) return u2net

  worker.postMessage({ type: "progress", status: "loading", progress: 10 })

  const ort = await import("onnxruntime-web")
  ort.env.wasm.numThreads = 1
  ort.env.wasm.wasmPaths = ORT_WASM_PATH

  const response = await fetch("/models/u2net/onnx/model.onnx")
  if (!response.ok) {
    throw new Error(`Could not load the object model (${response.status}).`)
  }

  const session = await ort.InferenceSession.create(
    await response.arrayBuffer(),
    { executionProviders: ["wasm"], graphOptimizationLevel: "all" }
  )

  u2net = { session, ort }
  return u2net
}

function u2netInput(bitmap: ImageBitmap) {
  const scale = Math.min(U2NET_SIZE / bitmap.width, U2NET_SIZE / bitmap.height)
  const drawW = Math.max(1, Math.round(bitmap.width * scale))
  const drawH = Math.max(1, Math.round(bitmap.height * scale))
  const ox = Math.floor((U2NET_SIZE - drawW) / 2)
  const oy = Math.floor((U2NET_SIZE - drawH) / 2)

  const canvas = new OffscreenCanvas(U2NET_SIZE, U2NET_SIZE)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not create a drawing surface.")
  context.fillStyle = "#000000"
  context.fillRect(0, 0, U2NET_SIZE, U2NET_SIZE)
  context.drawImage(bitmap, ox, oy, drawW, drawH)

  const pixels = context.getImageData(0, 0, U2NET_SIZE, U2NET_SIZE).data
  const data = new Float32Array(3 * U2NET_SIZE * U2NET_SIZE)
  const plane = U2NET_SIZE * U2NET_SIZE

  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    data[p] = (pixels[i] / 255 - U2NET_MEAN[0]) / U2NET_STD[0]
    data[plane + p] = (pixels[i + 1] / 255 - U2NET_MEAN[1]) / U2NET_STD[1]
    data[plane * 2 + p] = (pixels[i + 2] / 255 - U2NET_MEAN[2]) / U2NET_STD[2]
  }

  return { data, drawW, drawH, ox, oy }
}

async function cutoutObject(bitmap: ImageBitmap): Promise<Blob> {
  const { session, ort } = await loadU2Net()
  worker.postMessage({ type: "progress", status: "processing", progress: 0 })

  const { data, drawW, drawH, ox, oy } = u2netInput(bitmap)
  const tensor = new ort.Tensor("float32", data, [1, 3, U2NET_SIZE, U2NET_SIZE])
  const results = await session.run({ [session.inputNames[0]]: tensor })
  const output = results[session.outputNames[0]]
  const raw = output.data as Float32Array

  // U-2-Net's output is unnormalised. Stretch it to 0..1 before thresholding.
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] < min) min = raw[i]
    if (raw[i] > max) max = raw[i]
  }
  const range = max - min || 1

  const mask = new Uint8ClampedArray(U2NET_SIZE * U2NET_SIZE)
  for (let i = 0; i < mask.length; i++) {
    mask[i] = Math.round(smoothAlpha((raw[i] - min) / range) * 255)
  }
  erodeAlpha(mask, U2NET_SIZE, U2NET_SIZE, 1)

  // The mask is white with the alpha carrying the matte, so `destination-in`
  // can cut the photograph with it after the letterbox is cropped away.
  const maskPixels = new Uint8ClampedArray(U2NET_SIZE * U2NET_SIZE * 4)
  for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
    maskPixels[j] = 255
    maskPixels[j + 1] = 255
    maskPixels[j + 2] = 255
    maskPixels[j + 3] = mask[i]
  }
  const maskCanvas = matteCanvas(maskPixels, U2NET_SIZE, U2NET_SIZE)

  const cropped = new OffscreenCanvas(drawW, drawH)
  const croppedContext = cropped.getContext("2d")
  if (!croppedContext) throw new Error("Could not create a drawing surface.")
  croppedContext.drawImage(maskCanvas, -ox, -oy)

  const final = new OffscreenCanvas(bitmap.width, bitmap.height)
  const finalContext = final.getContext("2d")
  if (!finalContext) throw new Error("Could not create a drawing surface.")
  finalContext.drawImage(bitmap, 0, 0)
  finalContext.globalCompositeOperation = "destination-in"
  finalContext.imageSmoothingQuality = "high"
  finalContext.drawImage(cropped, 0, 0, bitmap.width, bitmap.height)

  return final.convertToBlob({ type: "image/png" })
}

// --- dispatch --------------------------------------------------------------

async function run(blob: Blob, mode: Mode): Promise<void> {
  const bitmap = await createImageBitmap(blob)
  try {
    const cutout =
      mode === "object"
        ? await cutoutObject(bitmap)
        : await cutoutPerson(blob, bitmap)
    worker.postMessage({ type: "result", blob: cutout })
  } finally {
    bitmap.close()
  }
}

worker.onmessage = (event: MessageEvent<StartMessage>) => {
  if (event.data?.type !== "start") return
  void run(event.data.blob, event.data.mode ?? "person").catch((error) => {
    worker.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  })
}
