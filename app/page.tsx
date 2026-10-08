import Link from "next/link"
import {
  Contrast,
  Download,
  Grid2x2,
  LayoutTemplate,
  Lock,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { GalleryGrid } from "@/components/landing/GalleryGrid"
import LogoIcon from "@/assets/logo-icon"
import { GALLERY } from "@/lib/gallery.generated"

/**
 * The landing page.
 *
 * One page, and it leads with the output rather than with claims about it: every
 * image below is a real export from the editor, produced by
 * `scratch/build-gallery.mjs` applying that template to that photo at that
 * canvas size and capturing what the Download button renders. If a template
 * changes, the gallery is rebuilt; the page cannot advertise something the tool
 * does not do.
 *
 * Written in the DESIGN/ voice — warm paper, sentence case, no exclamation
 * marks, and no numbers that are not either a standard (WCAG's 3:1 and 4.5:1)
 * or something the app itself computes.
 */

const FEATURES = [
  {
    icon: Contrast,
    title: "A contrast score that means something",
    body: "Most checkers sample the average colour behind your text and call it fine. Text fails where the background is at its worst, so Subtext measures the hardest part of what the text actually crosses, and counts the outline and shadow that are doing the work.",
  },
  {
    icon: LayoutTemplate,
    title: "Twenty templates, five moods",
    body: "Cinematic, editorial, aesthetic, bold and vintage type pairings, each with its own grade, grain and framing. Apply one, then move everything.",
  },
  {
    icon: Sparkles,
    title: "Film grain, duotone, vignette, letterbox",
    body: "The effects are composited into the file, not faked with a CSS overlay — what you see on the artboard is what lands in the download.",
  },
  {
    icon: Grid2x2,
    title: "Guides that hold things in place",
    body: "Rule of thirds, centre lines and a safe area, with snapping to the guides, to other layers and to the frame centre. Hold Alt to place something off-grid on purpose.",
  },
  {
    icon: Download,
    title: "Export at the size you need",
    body: "Square, portrait, story or widescreen, at up to 3× resolution as PNG or JPG, with your document's name on the file.",
  },
  {
    icon: Lock,
    title: "Nothing leaves your browser",
    body: "No account, no upload, no server. Your photo is read in the tab you are looking at and stored on your own device.",
  },
]

const STEPS = [
  {
    title: "Bring a photo",
    body: "Drop it on the artboard. It fills the frame, and its colours are read for the palette and the contrast score.",
  },
  {
    title: "Set the words",
    body: "Pick a template or start from a quote, an author line, a handle or a signature. Type, size and position are yours.",
  },
  {
    title: "Check it reads",
    body: "Select the text and the panel reports how it holds up against the worst part of the background, and offers colours that pass.",
  },
]

export default function LandingPage() {
  const hero = GALLERY[0]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <LogoIcon className="h-5 w-auto" />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">
              Subtext
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <a
              href="#gallery"
              className="hidden rounded-md px-2.5 py-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-subtle-hover hover:text-foreground sm:block"
            >
              Gallery
            </a>
            <a
              href="#features"
              className="hidden rounded-md px-2.5 py-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-subtle-hover hover:text-foreground sm:block"
            >
              Features
            </a>
            <Button
              size="sm"
              className="ml-1"
              nativeButton={false}
              render={<Link href="/editor" />}
            >
              Open the editor
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------------------- hero */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-10 sm:pt-20">
          <p className="text-[13px] font-medium tracking-[0.14em] text-[var(--text-muted)] uppercase">
            Free · no account · runs in your browser
          </p>

          <h1
            className="mt-5 max-w-3xl text-[38px] leading-[1.08] font-medium tracking-[-0.02em] text-balance sm:text-[54px]"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Your words, on a photo, actually readable.
          </h1>

          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-[var(--text-secondary)] sm:text-[17px]">
            Subtext is a small editor for quotes over photographs. It sets the
            type, grades the picture, and — the part most tools skip — tells you
            how the text holds up against the hardest part of the background
            behind it, then helps you fix it.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/editor" />}
            >
              Start a composition
            </Button>
            <a
              href="#gallery"
              className="rounded-md px-3 py-2 text-[14px] text-[var(--text-secondary)] transition-colors hover:bg-subtle-hover hover:text-foreground"
            >
              See what it makes →
            </a>
          </div>

          {hero && (
            <figure className="mt-12">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/gallery/${hero.file}`}
                  width={hero.width}
                  height={hero.height}
                  alt={`A composition made in Subtext: “Tears in rain.” in a display serif over a dusk photograph, with widescreen bars.`}
                  className="block h-auto w-full"
                  fetchPriority="high"
                />
              </div>
              <figcaption className="mt-3 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--text-muted)]">
                <span>Made in Subtext</span>
                <span aria-hidden="true">·</span>
                <span>
                  {hero.template} template, {hero.ratio}
                </span>
              </figcaption>
            </figure>
          )}
        </section>

        {/* ------------------------------------------------------- problem */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 sm:gap-12">
            <h2 className="text-[22px] leading-snug font-medium tracking-[-0.01em] text-balance sm:text-[26px]">
              A contrast checker that samples the average will pass text that
              nobody can read.
            </h2>
            <div className="space-y-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              <p>
                A quote crossing a bright sky and a dark branch has a perfectly
                respectable average. It is unreadable in exactly one place — the
                place the text sits on.
              </p>
              <p>
                Subtext samples the region behind the selection and reports the
                ratio against its <em>worst</em> part, so the number describes
                the hardest thing your reader will hit. Large type needs 3:1;
                body copy needs 4.5:1. Those are the WCAG thresholds, and they
                are the bar the score is measured against.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ features */}
        <section
          id="features"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16"
        >
          <h2 className="text-[22px] font-medium tracking-[-0.01em] sm:text-[26px]">
            What is in it
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <feature.icon size={15} aria-hidden="true" />
                </span>
                <h3 className="mt-3.5 text-[15px] font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- gallery */}
        <section
          id="gallery"
          className="scroll-mt-20 border-y border-border bg-card"
        >
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="max-w-2xl">
              <h2 className="text-[22px] font-medium tracking-[-0.01em] sm:text-[26px]">
                Made with it, not mocked up
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Every image below came out of the editor — the template applied,
                the photo graded, the export captured. Nothing here is a
                screenshot of a design file.
              </p>
            </div>
            <GalleryGrid items={GALLERY.slice(1)} />
          </div>
        </section>

        {/* --------------------------------------------------- how it works */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-[22px] font-medium tracking-[-0.01em] sm:text-[26px]">
            How it goes
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="font-mono text-[12px] text-[var(--text-muted)] tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-[15px] font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ----------------------------------------------------------- cta */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                className="text-[26px] leading-tight font-medium tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Open it and make something.
              </h2>
              <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
                No sign-up, no upload, no cost. Your work stays on your device.
              </p>
            </div>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/editor" />}
            >
              Open the editor
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[12px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>Subtext — a quote editor that checks its own work.</span>
        <span>Free to use. Nothing is uploaded anywhere.</span>
      </footer>
    </div>
  )
}
