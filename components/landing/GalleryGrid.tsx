import type { GalleryItem } from "@/lib/gallery.generated"

/**
 * The gallery.
 *
 * CSS columns rather than a grid, because the images have different shapes —
 * square, portrait, story, widescreen — and columns let each keep its own
 * proportions without cropping every one to a common aspect. `break-inside-avoid`
 * is what stops an item being sliced across a column boundary.
 *
 * `loading="lazy"` and explicit width/height on every image: the shape is known
 * from the generated manifest, so the page reserves the right space and does not
 * reflow as the images arrive.
 */
export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="mt-10 gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3">
      {items.map((item) => (
        <figure
          key={item.file}
          className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border bg-background"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/gallery/${item.file}`}
            width={item.width}
            height={item.height}
            alt={`${item.note}. A composition made in Subtext with the ${item.template} template at ${item.ratio}.`}
            loading="lazy"
            className="block h-auto w-full"
          />
          <figcaption className="flex items-baseline justify-between gap-2 px-3 py-2.5">
            <span className="truncate text-[12px] font-medium text-foreground">
              {item.template}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
              {item.ratio}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
