import { EditorStore } from "@/types/store.types"
import { create } from "zustand"
import { createColorSlice } from "./slices/createColorSlice"
import { createContextMenuSlice } from "./slices/createContextMenuSlice"
import { createCoreSlice } from "./slices/createCoreSlice"
import { createHistorySlice } from "./slices/createHistorySlice"
import { createLayerSlice } from "./slices/createLayerSlice"

export const ASPECT_RATIOS = {
  "1:1 (Square)": { width: 1080, height: 1080 },
  "9:16 (Reels/Story)": { width: 1080, height: 1920 },
  "4:5 (Portrait)": { width: 1080, height: 1350 },
  "16:9 (YouTube)": { width: 1920, height: 1080 },
}

/**
 * ZUSTAND COMBINER:
 * This acts as the main entry point for the global store.
 * It merges all independent slices into a single unified state tree,
 * allowing any action in one slice (like `moveLayerToIndex`) to call
 * actions from another slice (like `saveHistoryState`).
 */
export const useEditorStore = create<EditorStore>()((...a) => ({
  ...createCoreSlice(...a),
  ...createHistorySlice(...a),
  ...createLayerSlice(...a),
  ...createColorSlice(...a),
  ...createContextMenuSlice(...a),
}))
