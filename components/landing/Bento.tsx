import {
  Contrast,
  Download,
  Grid2x2,
  Layers3,
  Lock,
  Sparkles,
  Type,
} from "lucide-react"

import { RevealGroup, RevealItem } from "@/components/landing/Reveal"
import { cn } from "@/lib/utils"

/**
 * The capability grid.
 *
 * A bento rather than a row of equal cards, following the reference: the tiles
 * differ in size because the features differ in weight, and an even grid would
 * say they matter equally. Two tiles are wide because what they describe — the
 * engine and the export — is what people are actually choosing between.
 *
 * Each tile carries a small mock of the thing it describes. Not screenshots: a
 * screenshot inside a marketing card is usually too small to read and dates the
 * moment the UI changes, whereas a diagram of the *idea* stays true.
 */

const TILES = [
  {
    icon: Contrast,
    title: "Readability, measured two ways",
    body: "The worst case and the typical case, side by side. The gap between them is the whole argument: a background can be comfortable on average and unreadable exactly where your text sits.",
    span: "lg:col-span-2",
    mock: "metrics",
  },
  {
    icon: Type,
    title: "Twenty templates",
    body: "Cinematic, editorial, aesthetic, bold and vintage pairings, each with its own grade and framing.",
    span: "",
    mock: "templates",
  },
  {
    icon: Grid2x2,
    title: "Guides that hold things in place",
    body: "Thirds, centre and a safe area, with snapping to the guides, to other layers and to the frame. Hold Alt to place something off-grid on purpose.",
    span: "",
    mock: "thirds",
  },
  {
    icon: Sparkles,
    title: "Grain, duotone, vignette, letterbox",
    body: "Composited into the file rather than faked with an overlay, so what is on the artboard is what the download contains.",
    span: "",
    mock: "grain",
  },
  {
    icon: Download,
    title: "Exports at the size you need",
    body: "Square, portrait, story and widescreen, up to 3× resolution, PNG or JPG — named after your document.",
    span: "",
    mock: "sizes",
  },
  {
    icon: Layers3,
    title: "Real layers",
    body: "Reorder by dragging, group what belongs together, and undo anything — thirty steps deep.",
    span: "lg:col-span-2",
    mock: "layers",
  },
  {
    icon: Lock,
    title: "Nothing leaves the browser",
    body: "No account, no upload, no server. Your photo is read in the tab you are looking at and stored on your own device.",
    span: "lg:col-span-4",
    mock: "local",
  },
]

export default function Bento() {
  return (
    <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TILES.map((tile) => (
        <RevealItem key={tile.title} className={cn("min-w-0", tile.span)}>
          <article
            className={cn(
              "flex h-full flex-col rounded-[20px] border border-border bg-card p-5 transition-colors hover:border-[var(--edge-strong)]",
              tile.span === "lg:col-span-2" && "sm:p-6"
            )}
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-subtle text-[var(--text-secondary)]">
              <tile.icon size={15} aria-hidden="true" />
            </span>

            <h3 className="mt-4 text-[15px] font-bold tracking-[-0.01em]">
              {tile.title}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {tile.body}
            </p>

            {/*
              `mt-auto` rather than `grow`: the tiles in a row share a height, so
              a short one has slack. Pushing the mock to the bottom puts that
              slack between the copy and the diagram, which reads as breathing
              room — with `grow` it pooled underneath as a hole.
            */}
            <div className="mt-5 pt-1" aria-hidden="true">
              <Mock kind={tile.mock} />
            </div>
          </article>
        </RevealItem>
      ))}
    </RevealGroup>
  )
}

/** Small diagrams of each idea. Pure CSS, so they never go stale. */
function Mock({ kind }: { kind: string }) {
  if (kind === "metrics") {
    return (
      /*
       * A miniature of the panel the editor actually shows: a score, a verdict,
       * and the two readings the disagreement is between. The previous version
       * was three anonymous bars in a grey box — a chart of nothing, and at that
       * size it read as a loading skeleton.
       */
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-subtle p-3.5">
        <div className="flex items-end justify-between gap-3">
          <span className="text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums">
            84
            <span className="ml-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              /100
            </span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/12 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span
              aria-hidden="true"
              className="size-1 rounded-full bg-emerald-600"
            />
            AA PASS
          </span>
        </div>

        {[
          {
            label: "Worst case",
            value: "3.96:1",
            swatch: "#6E6A72",
            tone: "text-destructive",
          },
          {
            label: "Typical",
            value: "10.9:1",
            swatch: "#C9C7C2",
            tone: "text-foreground",
          },
        ].map((row) => (
          <span
            key={row.label}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
              <span
                className="size-2.5 rounded-[2px] ring-1 ring-black/10"
                style={{ background: row.swatch }}
              />
              {row.label}
            </span>
            <span
              className={cn("font-mono text-[10px] tabular-nums", row.tone)}
            >
              {row.value}
            </span>
          </span>
        ))}
      </div>
    )
  }

  if (kind === "thirds") {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-subtle">
        {[1, 2].map((n) => (
          <span
            key={`v${n}`}
            className="absolute inset-y-0 w-px bg-[var(--edge-strong)]/50"
            style={{ left: `${(n * 100) / 3}%` }}
          />
        ))}
        {[1, 2].map((n) => (
          <span
            key={`h${n}`}
            className="absolute inset-x-0 h-px bg-[var(--edge-strong)]/50"
            style={{ top: `${(n * 100) / 3}%` }}
          />
        ))}
        <span className="absolute inset-y-0 left-1/2 w-px bg-primary" />
        <span className="absolute top-1/2 left-1/2 h-4 w-14 -translate-x-1/2 -translate-y-1/2 rounded border border-primary bg-primary/10" />
      </div>
    )
  }

  if (kind === "sizes") {
    return (
      <div className="flex items-end gap-2.5 rounded-xl bg-subtle p-3">
        {[
          { label: "1:1", w: 34, h: 34 },
          { label: "4:5", w: 27, h: 34 },
          { label: "9:16", w: 19, h: 34 },
          { label: "16:9", w: 46, h: 26 },
        ].map((frame) => (
          <div key={frame.label} className="flex flex-col items-center gap-1.5">
            <span
              className="rounded-[3px] border border-[var(--edge-strong)] bg-card"
              style={{ width: frame.w, height: frame.h }}
            />
            <span className="font-mono text-[9px] text-[var(--text-muted)]">
              {frame.label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (kind === "templates") {
    // Three miniature posters, sized like the frames they are.
    return (
      <div className="flex items-end gap-2 rounded-xl bg-subtle p-3">
        {[
          { label: "Cinematic", w: 32, h: 52, tone: "#241A38" },
          { label: "Editorial", w: 32, h: 46, tone: "#C9C7C2" },
          { label: "Bold", w: 32, h: 40, tone: "#7A2E4A" },
        ].map((frame) => (
          <div key={frame.label} className="flex flex-col items-center gap-1.5">
            <span
              className="rounded-[3px]"
              style={{
                width: frame.w,
                height: frame.h,
                background: frame.tone,
              }}
            />
            <span className="text-[9px] text-[var(--text-muted)]">
              {frame.label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (kind === "grain") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-subtle p-3">
        <span
          className="size-11 shrink-0 rounded-md"
          style={{
            background:
              "radial-gradient(60% 60% at 40% 35%, #E8B073, #6B3F5A 55%, #14121F)",
          }}
        />
        <span className="flex flex-1 flex-col gap-1.5">
          {["Grain", "Duotone", "Vignette"].map((label, index) => (
            <span key={label} className="flex items-center gap-2">
              <span className="w-[52px] shrink-0 text-[9px] text-[var(--text-muted)]">
                {label}
              </span>
              <span className="h-1 grow overflow-hidden rounded-full bg-[var(--edge-strong)]/40">
                <span
                  className="block h-full rounded-full bg-[var(--text-secondary)]"
                  style={{ width: `${[62, 40, 24][index]}%` }}
                />
              </span>
            </span>
          ))}
        </span>
      </div>
    )
  }

  if (kind === "layers") {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl bg-subtle p-3">
        {["Signature", "Quote", "Photograph"].map((label, index) => (
          <span
            key={label}
            className="flex items-center gap-2 rounded-md border border-transparent bg-card px-2 py-1.5"
            style={{ opacity: 1 - index * 0.18 }}
          >
            <span className="size-1.5 rounded-full bg-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-secondary)]">
              {label}
            </span>
          </span>
        ))}
      </div>
    )
  }

  // local
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-subtle p-3">
      {["Your device", "This tab", "No server"].map((label, index) => (
        <span key={label} className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-secondary)]">
            {label}
          </span>
          {index < 2 && (
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              ✓
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
