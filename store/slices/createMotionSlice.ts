import { DEFAULT_MOTION } from "@/lib/motion"
import { EditorStore, MotionSlice } from "@/types/store.types"
import { StateCreator } from "zustand"

/**
 * The motion settings behind the video export.
 *
 * Recording them in history is what makes changing a preset undoable and, more
 * practically, what marks the document dirty so autosave writes them. They live
 * in the store rather than the canvas because they describe what happens
 * *after* the composition exists.
 */
export const createMotionSlice: StateCreator<
  EditorStore,
  [],
  [],
  MotionSlice
> = (set, get) => ({
  motion: DEFAULT_MOTION,

  setMotion: (patch) => {
    set((state) => ({ motion: { ...state.motion, ...patch } }))
    get().saveHistoryState("Motion", { coalesceKey: "motion" })
  },
})
