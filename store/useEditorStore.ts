import { EditorStore } from "@/types/store.types"
import { create } from "zustand"
import { createBackgroundSlice } from "./slices/createBackgroundSlice"
import { createBrandSlice } from "./slices/createBrandSlice"
import { createColorSlice } from "./slices/createColorSlice"
import { createContextMenuSlice } from "./slices/createContextMenuSlice"
import { createCoreSlice } from "./slices/createCoreSlice"
import { createDesignSlice } from "./slices/createDesignSlice"
import { createElementSlice } from "./slices/createElementSlice"
import { createHistorySlice } from "./slices/createHistorySlice"
import { createLayerSlice } from "./slices/createLayerSlice"
import { createEffectSlice } from "./slices/effectStoreSlice"
import { createFontSlice } from "./slices/createFontSlice"

export const ASPECT_RATIOS = {
  "1:1 (Square)": { width: 1080, height: 1080 },
  "9:16 (Reels/Story)": { width: 1080, height: 1920 },
  "4:5 (Portrait)": { width: 1080, height: 1350 },
  "16:9 (YouTube)": { width: 1920, height: 1080 },
}

export const useEditorStore = create<EditorStore>()((...a) => ({
  ...createCoreSlice(...a),
  ...createBackgroundSlice(...a),
  ...createBrandSlice(...a),
  ...createFontSlice(...a),
  ...createHistorySlice(...a),
  ...createLayerSlice(...a),
  ...createColorSlice(...a),
  ...createContextMenuSlice(...a),
  ...createEffectSlice(...a),
  ...createElementSlice(...a),
  ...createDesignSlice(...a),
}))
