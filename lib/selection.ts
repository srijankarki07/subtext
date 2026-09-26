/**
 * What is selected, and what that means for the inspector.
 *
 * The inspector used to branch on one thing — `activeObject.type === "image"` —
 * and treat everything else as text. So selecting a vignette, a letterbox bar or
 * the selective-blur handle offered font, weight and letter-spacing controls:
 * a whole tab of settings that could not apply, because the object is not a text
 * block. The classification lives here, as a pure function over the handful of
 * attributes it needs, so it can be tested without a browser.
 *
 * `isEffect` is the authority on whether something is an effect layer — every
 * effect object sets it (`effectStoreSlice`). The id prefixes are the fallback
 * for telling the effect layers apart, which is the same convention
 * `lib/fabricDocument.ts` and `deleteActiveObject` already use.
 */

/** The attributes this classification needs. Fabric objects carry all of them. */
export interface SelectableLike {
  type?: string
  isEffect?: boolean
  id?: string
  /** On a blur overlay, the id of the handle that owns the zone. */
  overlayId?: string
  textType?: string
}

export type SelectionKind =
  "none" | "text" | "image" | "effect" | "multi" | "other"

export type EffectKind = "vignette" | "letterbox" | "blur" | "gradient"

export interface SelectionSummary {
  kind: SelectionKind
  count: number
  /** Present only for a single effect layer. */
  effect?: { kind: EffectKind; id: string }
  /** Heading for the inspector. */
  label: string
  /** One line explaining what the user can do with it. */
  hint: string
}

const TEXT_LABELS: Record<string, string> = {
  quote: "Quote",
  author: "Author line",
  handle: "Social handle",
  signature: "Signature",
}

/**
 * Which effect layer an object is, or `undefined` if it is not one.
 *
 * A blur zone is several objects behind one control — the handle you drag and
 * the blurred copies beneath it — so both report as `blur` and both resolve to
 * the *zone* id, which is the handle's. The panel and the store address a zone
 * by that id, not by the overlay's.
 */
export function effectKindOf(
  object: SelectableLike
): { kind: EffectKind; id: string } | undefined {
  const id = object.id
  if (!id) return undefined

  if (id.startsWith("vignette-")) return { kind: "vignette", id }
  if (id.startsWith("letterbox-")) return { kind: "letterbox", id }
  if (id.startsWith("blur-handle-")) return { kind: "blur", id }
  if (id.startsWith("blur-overlay-")) {
    return { kind: "blur", id: object.overlayId ?? id }
  }
  if (id === "gradient-overlay") return { kind: "gradient", id }

  return undefined
}

/** True for anything that is part of an effect layer rather than the artwork. */
export function isEffectLayer(object: SelectableLike): boolean {
  return object.isEffect === true || effectKindOf(object) !== undefined
}

const EFFECT_COPY: Record<EffectKind, { label: string; hint: string }> = {
  vignette: {
    label: "Vignette layer",
    hint: "Darkens the edges of the frame. Its controls are in the Cinema panel.",
  },
  letterbox: {
    label: "Letterbox bar",
    hint: "Crops the top and bottom to a wider ratio. Change it in the Cinema panel.",
  },
  blur: {
    label: "Blur zone",
    hint: "Blurs what sits behind your text. Drag it on the artboard; its strength is in the Cinema panel.",
  },
  gradient: {
    label: "Shadow gradient",
    hint: "Lays a gradient over the artwork so the text keeps its contrast. Strength is in the Cinema panel.",
  },
}

/**
 * Classifies a selection.
 *
 * A multi-selection is reported as `multi` whatever it contains: the group is
 * the thing the user is holding, and describing one member of it is how the old
 * panel misled them. The three effect layer kinds are resolved from any of the
 * group, but only when the group is a single object.
 */
export function classifySelection(objects: SelectableLike[]): SelectionSummary {
  const count = objects.length

  if (count === 0) {
    return {
      kind: "none",
      count: 0,
      label: "Nothing selected",
      hint: "Select something on the artboard to adjust it, or add something new.",
    }
  }

  if (count > 1) {
    return {
      kind: "multi",
      count,
      label: `${count} layers selected`,
      hint: "They move and scale together. Delete removes all of them.",
    }
  }

  const object = objects[0]
  const effect = effectKindOf(object)

  if (effect) {
    return {
      kind: "effect",
      count,
      effect,
      ...EFFECT_COPY[effect.kind],
    }
  }

  // `isEffect` without a recognised id: an effect layer from a future version,
  // or one whose id was rewritten. Better to say so than to offer font controls.
  if (object.isEffect === true) {
    return {
      kind: "effect",
      count,
      label: "Effect layer",
      hint: "This layer is applied by one of the Cinema panel's controls.",
    }
  }

  if (object.type === "i-text" || object.type === "textbox") {
    return {
      kind: "text",
      count,
      label: (object.textType && TEXT_LABELS[object.textType]) || "Text layer",
      hint: "Type, style and colour apply to this block.",
    }
  }

  if (object.type === "image") {
    return {
      kind: "image",
      count,
      label: "Photo",
      hint: "Replace it, reframe it, or grade it.",
    }
  }

  return {
    kind: "other",
    count,
    label: "Layer",
    hint: "This layer has no adjustable properties yet.",
  }
}
