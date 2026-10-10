import type { EffectSnapshot } from "@/lib/snapshot"
import type {
  BlurZoneState,
  LetterboxState,
  VignetteState,
} from "@/types/store.types"

/**
 * The stored document, and how to tell whether the current one is still it.
 *
 * There is one slot and one document: this is a single-document editor, so
 * "save" means "write the document you are looking at", not "save as". Autosave
 * writes the same slot, which makes an honest answer to "are there unsaved
 * changes?" the whole point of the exercise - a badge that says "Saved" while
 * the canvas differs from storage is worse than no badge.
 *
 * The answer is a *signature*: everything the payload carries, serialised in a
 * fixed order. Comparing signatures is what lets the badge be right in the
 * cases the old `isDirty` flag could not be - undoing back to the stored state,
 * or renaming the document and undoing that.
 */

/**
 * The copy the user asked for, written by Save and read by Restore.
 *
 * The app's own confirmation for New canvas promises that this "is not
 * affected" by clearing the artboard, so nothing automatic may write here.
 */
export const STORAGE_KEY = "Subtext_saved_project"

/**
 * Where the document currently being edited is kept, written automatically.
 *
 * Two slots rather than one, because "the document I am working on" and "the
 * copy I asked for" are different things and the UI already treats them as
 * different things - there is a Restore button and a separate Delete saved
 * project. Collapsing them into one slot made New canvas delete the saved copy,
 * contradicting its own dialog, and made a reload resurrect a project the user
 * had just discarded. Keeping them apart lets both promises hold: autosave
 * restores your session, and New canvas leaves your saved copy alone.
 *
 * The document slot is written only by autosave and by Save - the latter so that
 * what you saved is also what you come back to.
 */
export const DOCUMENT_KEY = "Subtext_document"

/**
 * Marks that the restored-session notice has been shown in this tab.
 *
 * In `sessionStorage`, not `localStorage`: the notice exists to explain a
 * document appearing by itself the first time, and after that it is nagging.
 * Session scope gives exactly that - it survives a reload, so a refresh does not
 * re-announce the same document, and it is gone once the tab is closed, so the
 * next visit is told again.
 */
export const RESTORE_NOTICE_KEY = "Subtext_restore_notice_shown"

/**
 * How long an edit waits before being written.
 *
 * Long enough that a burst of edits - a slider drag, a typed sentence - is one
 * write; short enough that a crash costs seconds of work rather than minutes.
 */
export const AUTOSAVE_DELAY_MS = 2500

/** Everything the stored project holds. Adding a field here adds it to the signature. */
export interface ProjectPayload {
  canvasJson: unknown
  artboard: { width: number; height: number }
  grainIntensity: number
  gradientOpacity: number
  vignettes: VignetteState[]
  blurZones: BlurZoneState[]
  letterboxes: LetterboxState[]
  imagePalette: string[]
  documentTitle: string
  /** Display only, and deliberately outside the signature. */
  savedAt: string
}

/**
 * The signature excludes `savedAt`.
 *
 * It is a timestamp of the write, not part of the document, so including it
 * would make every save look like a change to the next comparison and the badge
 * would never read "Saved".
 */
export function signatureOf(payload: Omit<ProjectPayload, "savedAt">): string {
  return JSON.stringify([
    payload.canvasJson,
    payload.artboard,
    payload.grainIntensity,
    payload.gradientOpacity,
    payload.vignettes,
    payload.blurZones,
    payload.letterboxes,
    payload.imagePalette,
    payload.documentTitle,
  ])
}

/**
 * The signature of state that has not been written yet.
 *
 * The history slice already holds a serialised canvas and a captured effect
 * snapshot, and re-serialising both on every commit just to ask this question
 * would double the cost of a slider drag. Same order as {@link signatureOf}, so
 * the two agree - which the persistence suite checks directly by saving and then
 * asserting the document reads as clean without another commit.
 */
export function signatureFromParts(parts: {
  canvasJson: string
  effects: EffectSnapshot
  documentTitle: string
  artboard: { width: number; height: number }
}): string {
  const { effects } = parts
  return JSON.stringify([
    JSON.parse(parts.canvasJson),
    parts.artboard,
    effects.grainIntensity,
    effects.gradientOpacity,
    effects.vignettes,
    effects.blurZones,
    effects.letterboxes,
    effects.imagePalette,
    parts.documentTitle,
  ])
}

/**
 * Whether an empty artboard counts as a change.
 *
 * It must not. Booting the editor commits an "Initial Canvas" snapshot, so
 * treating any commit as a change marked a brand-new session dirty - which then
 * autosaved an empty document, so a user who never drew anything had a "saved
 * project" to be offered back on their next visit.
 */
export function isDocumentEmpty(objectCount: number): boolean {
  return objectCount === 0
}
