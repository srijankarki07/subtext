/**
 * The main-thread side of background removal.
 *
 * The worker is created only when the feature is first used, and terminated
 * after each run. That keeps the model, the ONNX runtime and the WASM out of
 * the initial bundle entirely - the editor pays nothing for a feature most
 * sessions will not use until the button is pressed.
 */

export interface BackgroundRemovalUpdate {
  status: "loading" | "processing"
  progress: number
}

/**
 * Which model to run.
 *
 * `person` is MODNet, tuned for portraits. `object` is U-2-Netp, a general
 * saliency model for products, animals and scenes.
 */
export type BackgroundRemovalMode = "person" | "object"

type WorkerMessage =
  | { type: "progress"; status: "loading" | "processing"; progress: number }
  | { type: "result"; blob: Blob }
  | { type: "error"; message: string }

export function removeBackgroundInWorker(
  blob: Blob,
  mode: BackgroundRemovalMode,
  onUpdate: (update: BackgroundRemovalUpdate) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./backgroundRemoval.worker.ts", import.meta.url),
      { type: "module" }
    )

    const finish = (done: () => void) => {
      worker.terminate()
      done()
    }

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data

      if (message.type === "progress") {
        onUpdate({ status: message.status, progress: message.progress })
        return
      }

      if (message.type === "result") {
        finish(() => resolve(message.blob))
        return
      }

      finish(() => reject(new Error(message.message)))
    }

    worker.onerror = (event) => {
      finish(() =>
        reject(new Error(event.message || "The background remover failed."))
      )
    }

    worker.postMessage({ type: "start", blob, mode })
  })
}
