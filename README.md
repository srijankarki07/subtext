# Subtext

Cinematic design, zero friction. Subtext is a browser-based editor for making
posters, thumbnails and social posts out of a photograph: import an image, grade
it, and lay type over it that stays readable against whatever is behind it.

Everything runs in the browser. No account, no upload, no server round-trip —
once the page has loaded your image never leaves the machine.

## What it does

- **Image editing on a real canvas.** Pan, zoom, rotate, crop and resize the
  artwork, which is sized from the document rather than the viewport. Built on
  [Fabric.js](https://fabricjs.com/), with the object graph serialised straight
  into the editor store.
- **Colour and light.** Grading presets, duotone, grain and blur, driven by a
  colour engine that samples the image and reports what it finds — dominant
  colours, average luminance, and the worst-case contrast behind any region.
- **Typography that stays legible.** A curated set of Google Fonts, loaded and
  exposed as CSS variables in `app/layout.tsx`. Text visibility is measured
  against the hardest part of the background rather than the average, so a
  headline crossing a bright window does not quietly fail.
- **Layers, templates and export.** Reorderable layers with previews and
  multi-select, starting templates, and image export at the document's real size.

## Stack

| Concern   | Choice                                            |
| --------- | ------------------------------------------------- |
| Framework | Next.js 16 (App Router)                           |
| UI        | React 19, Tailwind CSS 4, shadcn/ui on Base UI    |
| Canvas    | Fabric.js 7                                       |
| State     | Zustand 5, split into slices under `store/slices` |
| Fonts     | `next/font/google`, exposed as CSS variables      |
| Extras    | next-themes, colorthief, lucide-react             |

## Getting started

You will need Node.js 20.9 or newer (Next.js 16's minimum) and
[pnpm](https://pnpm.io/). Development happens on Node 24 and pnpm 10.

```bash
pnpm install
pnpm dev
```

Then open <http://localhost:3000>. The landing page is the pitch; the editor
lives at `/editor`.

## Scripts

| Script           | Does                          |
| ---------------- | ----------------------------- |
| `pnpm dev`       | Dev server on port 3000       |
| `pnpm build`     | Production build              |
| `pnpm start`     | Serve the production build    |
| `pnpm lint`      | ESLint                        |
| `pnpm format`    | Prettier over `**/*.{ts,tsx}` |
| `pnpm typecheck` | `tsc --noEmit`                |

## Layout

```
app/            Routes. `page.tsx` is the landing page, `app/editor` the editor.
components/     React components: `editor/`, `panels/`, `modals/`, `ui/`.
lib/            Framework-free logic — colour maths, filters, fonts, templates.
store/          Zustand store, composed from the slices in `store/slices`.
types/          Shared types for the store and templates.
public/         Static assets served as-is.
```

The split that matters: anything in `lib/` should be plain TypeScript with no
React in it, and anything in `store/` should describe editor state rather than
touch the DOM. Canvas work goes through Fabric.

## Conventions

- Prettier owns formatting: no semicolons, double quotes, 2-space indent, 80
  columns, Tailwind classes sorted by the plugin. `pnpm format` before pushing.
- Commits follow Conventional Commits — `feat(panels): …`, `fix(export): …`.
- `AGENTS.md` documents the house rules for the Next.js version in use, which
  differs from older releases in ways that matter.

## Licence

Private and unpublished. All rights reserved.
