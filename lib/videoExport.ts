/**
 * Rendering the composition as a video.
 *
 * One frame loop drives everything: apply the motion at time `t` to the live
 * objects, render the artboard, hand the pixels to the encoder. The same loop
 * powers the preview, so what is exported is what was previewed.
 *
 * WebCodecs encodes H.264 into an MP4 through `mp4-muxer` (MIT). It is marked
 * deprecated upstream in favour of mediabunny (MPL-2.0); this project chose the
 * MIT dependency deliberately, and the API used here is small enough to migrate
 * later without touching the rest of the export pipeline.
 *
 * MediaRecorder is the fallback where WebCodecs is missing. It records the
 * canvas in real time to WebM, which is slower than real time only if the frames
 * cannot keep up - the alternative was no video at all on those browsers.
 */

import {
  ActiveSelection,
  type Canvas,
  type FabricImage,
  type IText,
} from "fabric"
import { ArrayBufferTarget, Muxer } from "mp4-muxer"

import { withoutEditorChrome } from "./fabricDocument"
import { applyGrain } from "./grain"
import {
  blockFrame,
  kenBurnsScale,
  videoSize,
  type MotionSettings,
} from "./motion"

const FPS = 30

/**
 * H.264 profiles to try, best-supported first.
 *
 * Headless Chrome, and some real browsers, expose the Main and High profiles
 * but not Baseline - so a single hard-coded codec string is a broken export on
 * those machines. The first one the encoder accepts is used.
 */
const AVC_CODECS = ["avc1.42001f", "avc1.4d002a", "avc1.640028"]

async function supportedCodec(
  width: number,
  height: number
): Promise<string | null> {
  if (typeof VideoEncoder === "undefined") return null

  for (const codec of AVC_CODECS) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 6_000_000,
        framerate: FPS,
      })
      if (supported) return codec
    } catch {
      // An unknown codec string throws rather than returning false.
    }
  }

  return null
}

export type VideoPhase = "rendering" | "encoding" | "saving"

export interface VideoProgress {
  phase: VideoPhase
  frame: number
  total: number
}

export interface VideoResult {
  blob: Blob
  width: number
  height: number
  frames: number
  format: "mp4" | "webm"
}

interface TextEntry {
  object: IText
  top: number
  opacity: number
  text: string
}

interface ImageEntry {
  object: FabricImage
  left: number
  top: number
  scaleX: number
  scaleY: number
}

export interface Scene {
  texts: TextEntry[]
  images: ImageEntry[]
}

/** Everything a frame mutates, so the editor can be put back exactly. */
function snapshotScene(canvas: Canvas): Scene {
  const texts = (canvas.getObjects() as Array<IText | FabricImage>)
    .filter(
      (object) =>
        object.type === "i-text" &&
        (object as { isEffect?: boolean }).isEffect !== true
    )
    .sort((a, b) => (a.top ?? 0) - (b.top ?? 0)) as IText[]

  const images = (canvas.getObjects() as FabricImage[]).filter(
    (object) =>
      object.type === "image" &&
      (object as { isEffect?: boolean }).isEffect !== true
  )

  return {
    texts: texts.map((object) => ({
      object,
      top: object.top ?? 0,
      opacity: object.opacity ?? 1,
      text: String(object.text ?? ""),
    })),
    images: images.map((object) => ({
      object,
      left: object.left ?? 0,
      top: object.top ?? 0,
      scaleX: object.scaleX ?? 1,
      scaleY: object.scaleY ?? 1,
    })),
  }
}

/** Applies the animation at `time` seconds. Mutates; pair with `restoreScene`. */
export function applyMotionFrame(
  canvas: Canvas,
  scene: Scene,
  time: number,
  settings: MotionSettings
): void {
  const frameHeight = canvas.getHeight()

  scene.texts.forEach((entry, index) => {
    const frame = blockFrame(
      time,
      settings,
      index,
      scene.texts.length,
      entry.text.length,
      frameHeight
    )

    entry.object.set({
      opacity: entry.opacity * frame.opacity,
      top: entry.top + frame.offsetY,
      text:
        frame.characters === null
          ? entry.text
          : entry.text.slice(0, frame.characters),
    })
    entry.object.setCoords()
  })

  // Scaling about the frame's centre, not the object's origin: a Ken Burns move
  // zooms *into the frame*, and a photo placed off-centre by smart crop would
  // otherwise drift sideways as it grew.
  const scale = kenBurnsScale(time, settings)
  if (scale !== 1) {
    const centreX = canvas.getWidth() / 2
    const centreY = frameHeight / 2

    scene.images.forEach((entry) => {
      entry.object.set({
        scaleX: entry.scaleX * scale,
        scaleY: entry.scaleY * scale,
        left: centreX + (entry.left - centreX) * scale,
        top: centreY + (entry.top - centreY) * scale,
      })
      entry.object.setCoords()
    })
  }

  canvas.requestRenderAll()
}

function restoreScene(canvas: Canvas, scene: Scene): void {
  scene.texts.forEach((entry) => {
    entry.object.set({
      opacity: entry.opacity,
      top: entry.top,
      text: entry.text,
    })
    entry.object.setCoords()
  })
  scene.images.forEach((entry) => {
    entry.object.set({
      left: entry.left,
      top: entry.top,
      scaleX: entry.scaleX,
      scaleY: entry.scaleY,
    })
    entry.object.setCoords()
  })
  canvas.requestRenderAll()
}

/** An even-dimensioned copy, which is what H.264 requires. */
function frameCanvas(
  source: HTMLCanvasElement,
  width: number,
  height: number
): HTMLCanvasElement {
  if (source.width === width && source.height === height) return source
  const staging = document.createElement("canvas")
  staging.width = width
  staging.height = height
  staging.getContext("2d")?.drawImage(source, 0, 0, width, height)
  return staging
}

function renderFrame(
  canvas: Canvas,
  grainIntensity: number
): HTMLCanvasElement {
  const element = withoutEditorChrome(canvas, () => canvas.toCanvasElement(1))
  // Grain is a static, seeded tile, so each frame carries the same texture the
  // still export uses rather than a flicker of fresh noise.
  applyGrain(element, grainIntensity, { scale: 1 })
  return element
}

async function encodeMp4(
  canvas: Canvas,
  scene: Scene,
  settings: MotionSettings,
  width: number,
  height: number,
  frames: number,
  grainIntensity: number,
  codec: string,
  onProgress: (progress: VideoProgress) => void
): Promise<VideoResult> {
  // Loaded on demand: the muxer is only needed the moment a video is exported,
  // so the editor's first paint does not pay for it.
  const { ArrayBufferTarget, Muxer } = await import("mp4-muxer")

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  })

  let failure: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      failure = error instanceof Error ? error : new Error(String(error))
    },
  })

  encoder.configure({
    codec,
    width,
    height,
    bitrate: 6_000_000,
    framerate: FPS,
  })

  for (let index = 0; index < frames; index++) {
    if (failure) break

    applyMotionFrame(canvas, scene, index / FPS, settings)
    const element = frameCanvas(
      renderFrame(canvas, grainIntensity),
      width,
      height
    )
    const frame = new VideoFrame(element, {
      timestamp: Math.round((index * 1_000_000) / FPS),
      duration: Math.round(1_000_000 / FPS),
    })

    encoder.encode(frame, { keyFrame: index % (FPS * 2) === 0 })
    frame.close()
    onProgress({ phase: "rendering", frame: index + 1, total: frames })

    // Let the encoder drain and the UI paint between frames.
    if (index % 2 === 1) await new Promise((resolve) => setTimeout(resolve, 0))
  }

  onProgress({ phase: "encoding", frame: frames, total: frames })
  await encoder.flush()
  encoder.close()

  if (failure) throw failure
  muxer.finalize()

  const buffer = muxer.target.buffer
  if (!buffer) throw new Error("The encoder produced no data")

  return {
    blob: new Blob([buffer], { type: "video/mp4" }),
    width,
    height,
    frames,
    format: "mp4",
  }
}

async function recordWebm(
  canvas: Canvas,
  scene: Scene,
  settings: MotionSettings,
  width: number,
  height: number,
  frames: number,
  grainIntensity: number,
  onProgress: (progress: VideoProgress) => void
): Promise<VideoResult> {
  const staging = document.createElement("canvas")
  staging.width = width
  staging.height = height
  const context = staging.getContext("2d")
  if (!context) throw new Error("Could not create the recording surface")

  const stream = staging.captureStream(FPS)
  const mimeType = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type))
  if (!mimeType) throw new Error("This browser cannot record video")

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })

  recorder.start()
  const startedAt = performance.now()

  for (let index = 0; index < frames; index++) {
    const target = startedAt + ((index + 1) * 1000) / FPS
    applyMotionFrame(canvas, scene, index / FPS, settings)
    const element = frameCanvas(
      renderFrame(canvas, grainIntensity),
      width,
      height
    )
    context.drawImage(element, 0, 0, width, height)
    onProgress({ phase: "rendering", frame: index + 1, total: frames })

    const wait = target - performance.now()
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  }

  recorder.stop()
  await stopped
  stream.getTracks().forEach((track) => track.stop())

  return {
    blob: new Blob(chunks, { type: mimeType }),
    width,
    height,
    frames,
    format: "webm",
  }
}

/**
 * Exports the composition as a video.
 *
 * The selection is dropped for the duration (handles must not be filmed) and
 * restored afterwards, and the canvas is always put back, including when the
 * encoder throws - a failed export must not leave the artwork mid-animation.
 */
export async function exportMotionVideo(
  canvas: Canvas,
  settings: MotionSettings,
  grainIntensity: number,
  onProgress: (progress: VideoProgress) => void
): Promise<VideoResult> {
  const { width, height } = videoSize(canvas.getWidth(), canvas.getHeight())
  const frames = Math.max(1, Math.round(settings.duration * FPS))
  const scene = snapshotScene(canvas)

  const selected = canvas.getActiveObjects()
  canvas.discardActiveObject()

  try {
    const codec =
      typeof VideoFrame !== "undefined"
        ? await supportedCodec(width, height)
        : null

    if (codec) {
      return await encodeMp4(
        canvas,
        scene,
        settings,
        width,
        height,
        frames,
        grainIntensity,
        codec,
        onProgress
      )
    }

    return await recordWebm(
      canvas,
      scene,
      settings,
      width,
      height,
      frames,
      grainIntensity,
      onProgress
    )
  } finally {
    restoreScene(canvas, scene)
    if (selected.length === 1) {
      canvas.setActiveObject(selected[0])
    } else if (selected.length > 1) {
      canvas.setActiveObject(new ActiveSelection(selected, { canvas }))
    }
    canvas.requestRenderAll()
  }
}

/**
 * Plays the animation on the live canvas.
 *
 * `shouldStop` is polled every frame so the panel's Stop button can end it
 * without reaching into the renderer.
 */
export async function previewMotion(
  canvas: Canvas,
  settings: MotionSettings,
  shouldStop: () => boolean = () => false
): Promise<void> {
  const scene = snapshotScene(canvas)
  const selected = canvas.getActiveObjects()
  canvas.discardActiveObject()

  try {
    await new Promise<void>((resolve) => {
      const startedAt = performance.now()

      const tick = () => {
        if (shouldStop()) return resolve()

        const elapsed = (performance.now() - startedAt) / 1000
        const time = Math.min(settings.duration, elapsed)
        applyMotionFrame(canvas, scene, time, settings)

        if (elapsed >= settings.duration) resolve()
        else requestAnimationFrame(tick)
      }

      requestAnimationFrame(tick)
    })
  } finally {
    restoreScene(canvas, scene)
    if (selected.length === 1) canvas.setActiveObject(selected[0])
    canvas.requestRenderAll()
  }
}
