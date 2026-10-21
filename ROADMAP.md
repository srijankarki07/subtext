# Subtext — Roadmap

> What to build next, why, and what is deliberately not being built.

Companion to `design.md` (the visual and UX specification, still the source of
truth for anything on screen) and `BRANCHES.md` (the local, gitignored branch
log). Written 2026-10-14.

---

## The two constraints

**No backend.** Nothing may require a server, an account, or a server round-trip
for user data. The README's promise — your image never leaves the machine — is
kept for everything in this document, including the machine learning.

**Free-tier hosting.** The site must run on a free plan.

### What that rules out

| Not possible                          | Why                                                             |
| ------------------------------------- | --------------------------------------------------------------- |
| Accounts, cloud saves, team sync      | Needs auth and storage. Replaced by the local library (§ Tier 1) |
| Real-time collaboration               | Multiplayer needs a server. The Figma half of the north star stops at interaction quality |
| Stock photo libraries                 | Their APIs need a key, and a browser-side key is a public key    |
| Social scheduling, publish-to-platform| OAuth plus a server                                             |
| Server-side render                    | Exports run on the user's CPU, bounded by their device           |
| Audio libraries for Reels             | Licensing, not technology                                        |

### What it does not rule out

The browser can do most of what used to need a server. This is the whole reason
the roadmap is as ambitious as it is:

- **On-device inference** — ONNX Runtime Web (WASM, WebGPU where available).
- **Video export** — WebCodecs for control, `MediaRecorder` as the fallback.
- **Real storage** — IndexedDB, already in use for photos and fonts.
- **Real files** — the File System Access API, so "save" means save in place.

---

## Hosting: Vercel Hobby, with a known ceiling

**Decided 2026-10-14: Subtext stays on Vercel's Hobby plan.** It is free, the
project is already there, and the app is a static export with no server work, so
nothing about the deployment is in the way.

The cost is a licensing ceiling rather than a technical one. Vercel's Fair Use
Guidelines say _Hobby teams are restricted to non-commercial personal use only_,
and they define commercial broadly enough to include advertising a product or
service. Subtext is a personal project and is not monetised, so the plan fits
today.

**The trigger to revisit:** the first time Subtext is monetised, advertised as a
product, or carries ads. The migration is honest work at that point, and cheap —
with no backend the app is effectively a static export, so it is an afternoon
now and a week later. Cloudflare Pages and Netlify both permit commercial use,
and Cloudflare serves bandwidth unmetered.

Two consequences follow from staying on the free tier, and both are already
designed for:

- **Model weights are served from Vercel's origin** and count against the free
  tier's ~100 GB monthly transfer. A 20 MB model downloaded by 5,000 users is
  100 GB on its own. This is why the background remover caches its weights in
  Cache Storage: one download per user, ever, rather than one per visit.
- **Ship one model, not three.** The free tier is the reason the Tier 3 extras —
  magic eraser, upscaling — are cut rather than deferred.

---

## North star

**Figma-grade interaction, Canva-grade outcome.** A non-designer gets a
good-looking social post in under two minutes from a template; the instant they
want precision, precision is there. Those pull in opposite directions, and the
tension between them is where the design work actually is.

`design.md` already says this — _the artwork is the hero, the UI is the frame_,
_less interface, more intention_. Everything below is that, completed.

---

## Where the code stands

Thirty branches, every planned feature built, three verification suites. The
stack is Next 16 / React 19 / Tailwind 4 / Fabric 7 / Zustand in seven slices,
with `lib/` kept React-free.

Four facts about the current architecture set the cost of almost everything
below. They are worth knowing before reading the tiers.

**1. A tool is six hand-synced lists, and there is no registry.** Adding one
means editing the `EditorTool` union and the `TOOLS` array in `ToolRail.tsx`, the
copy and dispatch in `ContextPanel.tsx`, `TOOL_KEYS` in `EditorShell.tsx`, and
the tool tuple list in `lib/commands.ts`. Worse, the shortcut advertised in the
tooltip and the palette is **decoupled from the code that implements it** — the
key handler is hand-written elsewhere, so a tool can advertise a key that does
nothing. That is a live failure mode, not a hypothetical one.

**2. The document is one photo plus text.** Images can stack, and `MediaPanel`
will happily add a second, but every effect resolves "the photo" with
`.find(object => object.type === "image" && !object.isEffect)` — grading, duotone,
blur and templates all apply to the **first** non-effect image and ignore the
rest. Multi-image is not a supported state; it is an accident.

**3. There is no frame, mask or crop concept for objects.** Images are scaled to
cover the artboard and nothing more. And `DOCUMENT_PROPERTIES` in
`lib/fabricDocument.ts` — the whitelist of what survives save, undo and reload —
carries no `clipPath`, so a clip path applied to an ordinary object would not
round-trip.

**4. Export is strictly one render per action.** `ExportModal` calls
`toCanvasElement(scale)`, composites grain, and downloads. There is no loop over
sizes or formats anywhere.

---

## Tier 0 — Foundations

Small, unglamorous, and everything later lands better on top of it.

| Item                              | Why                                                                                                        | Cost |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| A tool registry                   | One `TOOLS` array that the rail, panel, palette and key handler all read. Removes the six-file hand-sync and the advertised-shortcut-that-does-nothing class of bug | S    |
| Align and distribute to selection | Only align-to-canvas exists today. Figma-grade precision starts here                                        | S    |
| Grouping and ungrouping           | Canva's whole model assumes it. Every multi-object action wants it first                                     | M    |
| Arrow-key nudging                 | 1px, 10px with shift. Absence of it is felt on every single composition                                     | S    |

**Parallel track, not blocking:** the three cross-cutting passes already named in
`BRANCHES.md` — the editor accessibility audit (the landing page was audited, the
editor never has been), editor motion, and the 768–1024 tablet layout. They
matter and they are not prerequisites for features. The accessibility pass is
worth doing deliberately: a canvas with Fabric's own hit-testing is the hard part,
and it is easier to design keyboard paths for new tools as they arrive than to
retrofit them.

---

## Tier 1 — Canva parity

This is what makes it a Canva-like product rather than an excellent single-photo
tool.

### 1. Elements library

The biggest visible gap. `design.md` §7 specs it; it is the one rail item that
was never built. Shapes, lines, dividers, frames, icons, stickers.

`lucide-react` is already a dependency and is ISC-licensed, which covers line
icons immediately. Shapes and dividers are hand-authored SVG. A declarative
`lib/elements.ts` — id, name, category, keywords, path data, default size and
fill — mirrors how `lib/templates.ts` and `lib/fonts.ts` already work, so the
pattern is established.

Because Fabric's own shape objects (`Path`, `Rect`, `Circle`, `Polygon`) serialise
natively, this needs **no change to `DOCUMENT_PROPERTIES`** as long as we do not
attach custom attributes. Insertion goes through the existing
`saveHistoryState`, so undo is free.

| Cost | Notes                                                                     |
| ---- | ------------------------------------------------------------------------- |
| M    | New `lib/elements.ts`, `ElementsPanel`, one store action, six tool touchpoints (which Tier 0 removes). **Licence audit required** on any SVG pack |

### 2. Background remover

The requested one. It is viable entirely on-device, but the obvious library is a
trap.

`@imgly/background-removal` is the popular browser package and it is **AGPL-3.0**
— embedding it in a closed-source product can oblige you to publish your source.
The clean path is **Transformers.js (Apache-2.0) with a permissively licensed
model** on ONNX Runtime Web. Whatever model is chosen, its licence gets checked
before it ships, not after.

Non-negotiables for this feature:

- **Lazy-load.** The model must never touch the initial bundle.
- **Run it in a Web Worker.** On the main thread inference freezes the entire UI
  for 2–15 seconds.
- **Cache it in Cache Storage.** One download per user, ever.
- **Self-host the weights.** A CDN is a dependency you do not control, and this is
  also why the hosting decision above comes first.

Integration is unusually clean because of fact 2: replacing the photo's bitmap
with a cutout keeps it "the photo", so grading, duotone, blur zones, templates
and the before/after comparison all keep working untouched. The pixels already
live out of band in IndexedDB keyed by `assetId`.

The interesting design question is what fills the hole. Artboard colour, or a
gradient built from the image's own palette — colorthief already samples it —
which is where item 8 pays off. And a cutout subject over a backdrop is a
*composition*, not a utility: the contrast engine can then measure text against
the backdrop and the subject independently.

| Cost | Notes                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------- |
| L    | Mostly risk and integration rather than lines. Bundle discipline is the real work               |

### 3. Magic Resize, and multi-size export

Two features filed together, with very different costs.

**Multi-size export** — the same composition at 1×/2×/3×, PNG and JPG, in one
action — is a loop around the existing single-render path. Small.

**Magic Resize** — the same composition reflowed to another aspect ratio — is the
valuable one. It needs the photo re-cover-cropped and the text repositioned. The
foundation already exists: `TemplateTextConfig` stores text positions as 0–1
relative values, so a resize is a remap rather than a re-layout.

| Cost | Notes                                                                     |
| ---- | ------------------------------------------------------------------------- |
| S    | multi-size export — a loop over what `ExportModal` already does            |
| M    | Magic Resize — re-cover the photo, remap relative positions, keep effects  |

### 4. Text effects and text presets

Lift, hollow, neon, outline — Canva's most-used type features, and cheap on
Fabric: shadow and stroke already exist. **Splice needs a clip path**, which
means adding `clipPath` to `DOCUMENT_PROPERTIES` first (fact 3) or the effect
vanishes on reload. Small, but it must be done deliberately.

Presets are data, the same way templates are.

| Cost | Notes                                                                    |
| ---- | ------------------------------------------------------------------------ |
| M    | The effects themselves are easy; making them round-trip is the discipline |

### 5. Template quality

Browsing, applying and content, in three parts. The search and category counts
shipped first; these are the rest.

**Density.** The cards are full-width and four-fifths as tall, so twenty
templates are several screens of scrolling. A compact two-column grid keeps the
same previews - the look is what is being judged - while showing twice as much
at once.

**Visibility on apply.** A layout arrives with the colours it was designed with,
not the colours the user's photo needs. Applying one should run the contrast
engine over the real image and choose fill, outline and shadow for the *worst*
part of the background behind each block, which is the measurement the editor
already makes. Smart auto-colour also needs a defined fallback: when no passing
combination exists, apply a deterministic safety treatment (white type with a
dark shadow) rather than leaving the template's colours on an unreadable image.

**Content and grades.** More layouts, and a wider grade library: modern film
stocks, Fuji emulations (Classic Chrome, Velvia, Astia, Acros), and older
aesthetic looks. Grades are colour matrices authored for this project, never
copied from proprietary LUT files - the repo is public, and a copied `.cube` is
a licensing problem. A LUT-style *name* that references a stock is fine; a
copied transform is not.

| Cost | Notes                                                                      |
| ---- | -------------------------------------------------------------------------- |
| M    | Density and apply-time visibility are UI and store work; grades are authored data |

### 6. Gradient and pattern backgrounds

Real background fills, not the overlay that exists today. Pairs directly with the
background remover, and gives templates somewhere to sit.

| Cost | Notes                                              |
| ---- | -------------------------------------------------- |
| S–M  | Fabric gradients are native; patterns need a tile   |

### 7. Brand kit, local

Saved palettes, fonts and logos, one-click to apply. This is the accounts-free
substitute for Canva's Brand Kit, stored in IndexedDB — the pattern is already
established by `lib/customFonts.ts` and the asset store in `lib/assets.ts`.

| Cost | Notes                                                          |
| ---- | -------------------------------------------------------------- |
| M    | Storage is solved. The work is a management UI and apply paths  |

### 8. Designs home — a local library

Today there are two persistence slots per mode. Canva's mental model is "your
designs", and its absence is the single biggest thing that makes Subtext feel
like a demo rather than a product. An IndexedDB-backed list of designs with
thumbnails, names, sizes and timestamps, replacing the two slots.

| Cost | Notes                                                                     |
| ---- | ------------------------------------------------------------------------- |
| M    | Touches `lib/persistence.ts` and adds a route or a modal. Thumbnails are small JPEGs in IndexedDB |

### 9. Share without a server

A portable `.subtext` file — document JSON plus the referenced assets — plus
"save in place" via the File System Access API. Note the wrinkle: since branch
16, photos live out of band in IndexedDB, so a portable file must **embed** the
pixels or the recipient gets a document with a missing image. That means a
container format, which means a zip dependency (`fflate` is small and
permissive). Text-only designs can also be shared as a URL fragment.

Safari support for File System Access is patchy, so the plain download stays as
the fallback path.

| Cost | Notes                                                                  |
| ---- | ---------------------------------------------------------------------- |
| M    | The container is easy; scoping it to the existing asset store is the work |

---

## Tier 2 — The differentiators

These are the ones a Canva clone cannot copy, because they come from the contrast
engine.

### 10. Design suggestions

`design.md` §22, and the highest-leverage feature on this list. It converts the
visibility engine from a readout into a product feature: a warning that explains
itself, with a deterministic fix.

```text
Low contrast

Try:
• lighter text
• subtle shadow
• darker gradient
• move to upper third

[ Fix automatically ]
```

Everything it needs already exists — `lib/visibility.ts` computes the signal,
`lib/composition.ts` knows the geometry, and the fixes map onto store actions
that panels already call (`autoColorText`, `applyTextStyle`, the arrangement
actions). `design.md` is explicit that these should be **deterministic and
explainable** rather than a model's opinion, which is also what makes them cheap.

| Cost | Notes                                                                    |
| ---- | ------------------------------------------------------------------------ |
| M    | Mostly UI and threshold tuning over maths that is already written         |

### 11. Curves, levels and histogram

The professional end of grading. Pure canvas maths in `lib/`, a panel in the
inspector. Fabric's built-in filters cover brightness and contrast; curves need a
custom filter.

| Cost | Notes                                                 |
| ---- | ----------------------------------------------------- |
| M    | `lib/` work with a UI on top, not an integration risk  |

### 12. Font pairing

`design.md` §15. Pairings as data in `lib/fonts.ts`, surfaced in the existing
font picker. Small, and it strengthens the typography differentiator.

| Cost | Notes                                       |
| ---- | ------------------------------------------- |
| S–M  | Extends a panel that already exists          |

### 13. Auto-reframe and smart crop

The cheap, explainable version first: score crops by edge energy and entropy
using the sampling that already exists in `lib/colorUtils.ts`, and offer the best
one. Face detection (MediaPipe BlazeFace, Apache-2.0) only if the cheap version
proves insufficient — it is another model download for a marginal gain.

| Cost | Notes                                                                  |
| ---- | ---------------------------------------------------------------------- |
| M    | The heuristic version fits the deterministic ethos and ships sooner     |

---

## Tier 3 — Moving image

The stated use case is Reels. Subtext currently exports stills. This tier is the
strategic bet, and it is the most expensive work in the document.

### 14. Animated export

Text animation presets — typewriter, rise, fade — plus a Ken Burns move on the
photo, exported as video. **WebCodecs** with an `mp4-muxer` gives real H.264 MP4
and frame-accurate control; `MediaRecorder` with `canvas.captureStream()` is the
simpler fallback where WebCodecs is unavailable, and produces WebM.

Even a minimal version needs a timeline concept — per-object enter animation and
a duration — which is the first genuinely new document concept in this roadmap.
No audio: licensing, not technology.

| Cost | Notes                                                                    |
| ---- | ------------------------------------------------------------------------ |
| L    | Proves the video pipeline. Do this before video backgrounds               |

### 15. Video backgrounds

A `<video>` as the artboard image. Fabric has no native video object, so this
means a `FabricObject` subclass that renders the current frame on rAF, plus
frame-by-frame export through WebCodecs. It is the largest single item here and
it should not start until animated export has proven the pipeline.

| Cost | Notes                                                                     |
| ---- | ------------------------------------------------------------------------- |
| XL   | The biggest bet in the document. Deliberately last                          |

---

## Not being built

Recorded with reasons, so they can be revisited rather than rediscovered.

**Photo grids and collage — cut.** This is an identity decision as much as a cost
one. Subtext's promise is _make the words belong to the image_ — one hero
photograph, graded, with type that stays legible on it. Collage is a different
product. The cost is also real: it would need a genuine multi-photo model
(fact 2), clip-path round-tripping (fact 3), and a decision about which image the
effects target. Three architectural changes to serve a genre that fights the
brand.

**Multi-page documents, carousels and PDF export — deferred, not cut.** There is
one document, one artboard, and one persistence slot per mode. Multi-page means a
new document model, and a new persistence, history and export story with it. The
trigger to revisit: Tier 1 shipped and used, and either users asking for
carousels or templates that need more than one slide. Note that Magic Resize
(item 3) delivers a good share of what people actually want carousels for, at a
fraction of the cost.

**Magic eraser, upscaling, auto-subtitles — cut for now.** Each is another model
download and another licence question, for features most people use once.
Reconsider only after Tier 1 and Tier 2 are shipped and used.

**Stock photos, audio libraries, scheduling, collaboration — impossible
here.** Listed in the constraint table above. Nothing to decide.

**Being a video editor.** Trimming, cuts, transitions, multi-clip timelines.
Subtext puts type on an image. Tier 3 makes that image move; it does not make
Subtext an editor for footage.

---

## Sequencing

| Milestone | Contents                                                                   |
| --------- | -------------------------------------------------------------------------- |
| **M1 — Foundations** | Tool registry, align/distribute to selection, grouping, nudging, README name fix. Settle hosting |
| **M2 — The library** | Elements, text effects and presets, template search, designs home            |
| **M2.5 — Template quality** | Compact browsing grid, contrast-aware apply, wider layout and grade library |
| **M3 — The headline** | Background remover, design suggestions, magic resize and multi-size export   |
| **M4 — The long tail** | Brand kit, share and portability, gradient and pattern backgrounds, curves and levels, font pairing, auto-reframe |
| **M5 — Moving image** | Animated export, then video backgrounds                                     |

Ordering rationale: M1 makes every later tool cheaper and less bug-prone. M2 and
M3 are the Canva-parity core and the requested features. M2.5 was added on
2026-10-21: the template surface is already the product's front door, and making
it denser, contrast-aware and better stocked is cheaper than the ML work in M3
while improving the experience more immediately. M3 is deliberately where the
two things that only Subtext can do — the background remover feeding a generated
backdrop, and the contrast engine explaining itself — arrive together. Tier 2 and
Tier 3 are refinements and bets that should be judged on how M1–M3 land.

---

## How work ships

Unchanged from `CONTRIBUTING.md`, with two additions that this roadmap makes
necessary.

- One branch per item, prefixed by intent, one idea per pull request. Branch names
  lose the stack prefix now that everything lands on `main`.
- Conventional Commits, formatted before pushing, `pnpm typecheck` is the only
  static check that runs (`pnpm lint` cannot run at all — `typescript-eslint` 8
  refuses TypeScript 7).
- **Verification is by measurement, not by reading.** The three existing suites
  are the shape to copy: a new feature ships with a script that exercises it in a
  real browser and asserts on numbers. This is why `lib/` is kept React-free and
  pure — the arithmetic is testable in Node without a browser at all.
- **Bundle budget.** Any dependency over roughly 100 KB gzipped, and every model
  weight without exception, must be behind a dynamic import and only fetched when
  its feature is first used. The 3.3 MB of font files in `public/` — of which six
  are loaded and all of which are served — is the cautionary tale. Do not repeat
  it with a 40 MB model.
