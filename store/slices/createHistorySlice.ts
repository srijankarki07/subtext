import { bindBlurHandleListeners } from "@/lib/fabricDocument"
import { isDocumentEmpty, signatureFromParts } from "@/lib/persistence"
import {
  captureEffects,
  dehydrateCanvas,
  loadDocument,
  type EffectSnapshot,
} from "@/lib/snapshot"
import { EditorStore, HistoryItem, HistorySlice } from "@/types/store.types"
import { StateCreator } from "zustand"

const MAX_HISTORY_STEPS = 30

/**
 * Whether the current document differs from the stored one.
 *
 * An empty artboard on a fresh session is not a change - booting commits
 * "Initial Canvas" - but an empty artboard *over a stored document* is.
 * Undoing the last element, or deleting the last layer, has to be written, or a
 * reload quietly resurrects it.
 */
function documentIsDirty(
  savedSignature: string | null,
  objectCount: number,
  parts: Parameters<typeof signatureFromParts>[0]
): boolean {
  return (
    savedSignature !== signatureFromParts(parts) &&
    (savedSignature !== null || !isDocumentEmpty(objectCount))
  )
}

/**
 * Repeated edits of the same control inside this window collapse into the
 * previous entry.
 *
 * A range input fires on every step of a drag, and each one used to push a
 * snapshot - so dragging one slider across its range generated dozens of
 * entries and wiped the thirty-step stack in a couple of seconds. Grouping
 * repeats of the same control is what makes undo behave the way people expect:
 * one drag, one undo.
 */
const COALESCE_WINDOW_MS = 700

interface OpenTransaction {
  description: string
  json: string | null
  objectCount: number
  openedAt: number
}

/**
 * Set while a compound edit is in flight, so that only its *final* state is
 * recorded. Applying a template sets fonts, positions, grade, grain, vignette
 * and letterbox in a dozen separate calls; each used to be its own entry.
 */
let openTransaction: OpenTransaction | null = null

/**
 * A transaction whose body throws never reaches `endHistoryTransaction`, and a
 * dangling transaction is worse than a missing one: `saveHistoryState` routes
 * every later snapshot into it, so history silently stops recording.
 *
 * This is a safety net, not a deadline, so it is set well clear of the slowest
 * legitimate transaction rather than close to it. Most are synchronous and
 * finish in milliseconds, but importing a photo holds one open across an image
 * decode and a palette extraction, which can take seconds on a large file -
 * expiring it early would commit a half-finished snapshot and lose the title.
 * Anything still open after this long came from a body that threw.
 */
const TRANSACTION_TIMEOUT_MS = 30_000

let lastCommitAt = 0

export const createHistorySlice: StateCreator<
  EditorStore,
  [],
  [],
  HistorySlice
> = (set, get) => {
  /** Pushes one entry, or replaces the previous one when coalescing. */
  const commit = (
    json: string,
    title: string,
    objectCount: number,
    effects: EffectSnapshot,
    coalesceKey?: string
  ) => {
    const { history, historyIndex, artboard } = get()
    const next = history.slice(0, historyIndex + 1)
    const previous = next[next.length - 1]
    // Copied, not referenced: the entry has to describe the frame as it was
    // when the snapshot was taken, and the store's object is replaced on resize.
    const frame = { width: artboard.width, height: artboard.height }

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    const coalesce =
      coalesceKey !== undefined &&
      previous?.coalesceKey === coalesceKey &&
      Date.now() - lastCommitAt < COALESCE_WINDOW_MS

    if (coalesce) {
      // Keep the entry's identity and position; only its state moves forward.
      next[next.length - 1] = {
        ...previous,
        json,
        title,
        timestamp,
        objectCount,
        effects,
        artboard: frame,
      }
    } else {
      next.push({
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        json,
        title,
        timestamp,
        objectCount,
        effects,
        artboard: frame,
        coalesceKey,
      })
      if (next.length > MAX_HISTORY_STEPS) next.shift()
    }

    lastCommitAt = Date.now()
    const newIndex = next.length - 1

    const state = get()

    set({
      history: next,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false,
      // Compared against what is *stored*, not assumed from the fact that
      // something was committed. That is what makes undo-back-to-the-saved-state
      // read as saved: it is a commit, but it is not a change.
      isDirty: documentIsDirty(state.savedSignature, objectCount, {
        canvasJson: json,
        effects,
        documentTitle: state.documentTitle,
        artboard: state.artboard,
      }),
    })
  }

  return {
    history: [],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,
    isHistoryProcessing: false,

    saveHistoryState: (description, options) => {
      const { canvas, isHistoryProcessing, history, historyIndex } = get()
      if (!canvas || isHistoryProcessing) return

      try {
        const json = JSON.stringify(dehydrateCanvas(canvas))
        const objects = canvas.getObjects()

        if (openTransaction) {
          if (Date.now() - openTransaction.openedAt < TRANSACTION_TIMEOUT_MS) {
            openTransaction.json = json
            openTransaction.objectCount = objects.length
            return
          }
          // Abandoned by a throwing body; drop it and record normally.
          openTransaction = null
        }

        // A snapshot is only a no-op if *both* halves are unchanged. Comparing
        // the canvas alone silently dropped every store-only edit: film grain,
        // and grading when it is applied to the store rather than the object
        // graph, leave the canvas JSON byte-identical, so the dedupe returned
        // and the slider moved with nothing recorded to undo.
        const effects = captureEffects(get())
        const previous = history.slice(0, historyIndex + 1).pop()
        if (
          previous?.json === json &&
          JSON.stringify(previous.effects) === JSON.stringify(effects)
        ) {
          return
        }

        const objectCount = objects.length
        let title = description

        if (!title) {
          const previousCount = previous?.objectCount ?? 0
          if (!previous) {
            title = "Initial canvas"
          } else if (objectCount > previousCount) {
            const lastObject = objects[objects.length - 1]
            title =
              lastObject.type === "i-text"
                ? "Add text"
                : lastObject.type === "image"
                  ? "Add photo"
                  : "Add element"
          } else if (objectCount < previousCount) {
            title = "Delete layer"
          } else {
            const active = canvas.getActiveObject()
            title = active?.type === "i-text" ? "Edit text" : "Change canvas"
          }
        }

        commit(json, title, objectCount, effects, options?.coalesceKey)
      } catch (error) {
        console.error("Failed to save state history:", error)
      }
    },

    beginHistoryTransaction: (description) => {
      openTransaction = {
        description,
        json: null,
        objectCount: 0,
        openedAt: Date.now(),
      }
    },

    endHistoryTransaction: () => {
      const transaction = openTransaction
      openTransaction = null

      // Nothing changed inside the transaction, so nothing to record.
      if (!transaction?.json) return

      commit(
        transaction.json,
        transaction.description,
        transaction.objectCount,
        captureEffects(get())
      )
    },

    jumpToHistoryIndex: async (targetIndex) => {
      const { canvas, history, historyIndex, isHistoryProcessing } = get()
      if (
        !canvas ||
        isHistoryProcessing ||
        targetIndex < 0 ||
        targetIndex >= history.length ||
        targetIndex === historyIndex
      ) {
        return
      }

      set({ isHistoryProcessing: true })

      try {
        const targetState = history[targetIndex]

        // The frame is state, not part of the object graph. Restoring it first
        // means the effects the JSON describes are re-sized once, against the
        // frame they belong to. `setAspectRatio` is the low-level resize on
        // purpose: the objects are already laid out for this frame, so
        // reflowing them would move them twice.
        if (
          targetState.artboard &&
          (targetState.artboard.width !== get().artboard.width ||
            targetState.artboard.height !== get().artboard.height)
        ) {
          get().setAspectRatio(
            targetState.artboard.width,
            targetState.artboard.height
          )
        }

        await loadDocument(canvas, JSON.parse(targetState.json))

        // Grading and overlay state is not part of the Fabric object graph, so
        // restoring only the canvas left the panel showing a vignette whose
        // slider did nothing and whose Remove button referred to an object that
        // no longer existed.
        const effects = targetState.effects
        if (effects) {
          set({
            grainIntensity: effects.grainIntensity,
            gradientOpacity: effects.gradientOpacity,
            vignettes: effects.vignettes,
            blurZones: effects.blurZones,
            letterboxes: effects.letterboxes,
            duotoneLight: effects.duotoneLight,
            duotoneDark: effects.duotoneDark,
            duotoneIntensity: effects.duotoneIntensity,
            brightness: effects.brightness,
            contrast: effects.contrast,
            saturation: effects.saturation,
            warmth: effects.warmth,
            imagePalette: effects.imagePalette,
          })
        }

        // Re-bind draggable blur handles if any exist in the restored state
        bindBlurHandleListeners(canvas)

        canvas.requestRenderAll()

        // Restored from `getActiveObjects` rather than `getActiveObject`, so a
        // load that leaves several objects selected reports the same count the
        // selection events would - otherwise the inspector described one layer
        // while the artboard showed a group.
        const restored = canvas.getActiveObjects()
        const state = get()
        set({
          historyIndex: targetIndex,
          canUndo: targetIndex > 0,
          canRedo: targetIndex < history.length - 1,
          isHistoryProcessing: false,
          activeObject: restored[0] ?? null,
          selectedObjects: restored,
          // Undo is not an edit; it is a move to another state, which may or may
          // not be the stored one. Asking the signature is the only way to know,
          // and it is what makes the badge honest after an undo.
          isDirty: documentIsDirty(
            state.savedSignature,
            canvas.getObjects().length,
            {
              canvasJson: targetState.json,
              effects: targetState.effects,
              documentTitle: state.documentTitle,
              artboard: state.artboard,
            }
          ),
        })

        get().calculateContrast()
      } catch (error) {
        console.error("Jump to history error:", error)
        set({ isHistoryProcessing: false })
      }
    },

    undo: async () => {
      const { historyIndex } = get()
      if (historyIndex > 0) {
        await get().jumpToHistoryIndex(historyIndex - 1)
      }
    },

    redo: async () => {
      const { historyIndex, history } = get()
      if (historyIndex < history.length - 1) {
        await get().jumpToHistoryIndex(historyIndex + 1)
      }
    },
  }
}
