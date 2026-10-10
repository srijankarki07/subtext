"use client"

import { useEffect, useRef } from "react"

import { AUTOSAVE_DELAY_MS } from "@/lib/persistence"
import { useEditorStore } from "@/store/useEditorStore"

/**
 * Writes the document to storage shortly after it changes.
 *
 * The point is that nobody should lose work by forgetting to press Save, or by
 * closing the tab. Saving on *every* change would be wrong in a different way:
 * a slider drag commits dozens of snapshots a second, and `localStorage` writes
 * are synchronous - the drag would stutter. So changes are batched, and the
 * batch is flushed early when the tab is about to go away.
 *
 * `isDirty` is the trigger, and it is a comparison against what is stored rather
 * than a flag set by any edit (see `lib/persistence.ts`). That matters here: it
 * means undoing back to the stored state cancels the pending write instead of
 * causing a pointless one.
 *
 * There is deliberately **no `beforeunload` prompt.** With a flush on
 * `pagehide`/`visibilitychange` the window in which work could be lost is a
 * couple of seconds, and a modal "leave site?" dialog is a poor trade for that -
 * it also makes the page ineligible for the back/forward cache. The flush is the
 * mechanism; the prompt would only be noise.
 */
export default function Autosave() {
  const isDirty = useEditorStore((s) => s.isDirty)
  const canvas = useEditorStore((s) => s.canvas)

  // Read through a ref inside the listeners so they can be registered once and
  // still see the current state.
  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty

  useEffect(() => {
    if (!canvas || !isDirty) return

    const timer = setTimeout(() => {
      useEditorStore.getState().autosaveDocument()
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [canvas, isDirty])

  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return
      useEditorStore.getState().autosaveDocument()
    }

    // `visibilitychange` to hidden is the reliable one - `pagehide` and
    // `beforeunload` do not fire on mobile Safari when the app is backgrounded.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", flush)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", flush)
    }
  }, [])

  return null
}
