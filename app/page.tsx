import { Download, Grid2x2, RotateCcw, Sparkles, Wand2 } from "lucide-react"
import Link from "next/link"

import Bento from "@/components/landing/Bento"
import { Container } from "@/components/landing/Container"
import Gallery from "@/components/landing/Gallery"
import Hero from "@/components/landing/Hero"
import LiveContrast from "@/components/landing/LiveContrast"
import LiveGrade from "@/components/landing/LiveGrade"
import LiveSnap from "@/components/landing/LiveSnap"
import { Module, ModuleHeading } from "@/components/landing/Module"
import Nav from "@/components/landing/Nav"
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/Reveal"
import SiteFooter from "@/components/landing/SiteFooter"
import TemplateShowcase from "@/components/landing/TemplateShowcase"
import { Button } from "@/components/ui/button"
import { GALLERY } from "@/lib/gallery.generated"

/**
 * The landing page.
 *
 * One page, laid out as modules: every section is a rounded panel inside a
 * 1248px measure rather than a full-width band, so the page reads as a set of
 * composed objects instead of one continuous poster.
 *
 * The rule it holds itself to is that nothing here claims a capability the
 * editor does not have. The hero is a live render rather than a recording of
 * one - its grade is the editor's own colour matrix, its grid is the editor's
 * own guide geometry, and its comparison is the editor's own clip-path
 * construction. The gallery images are real exports, and
 * `scratch/build-gallery.mjs` regenerates them from the app, so the page cannot
 * drift away from the product.
 */

const HOW_IT_WORKS = [
  {
    icon: Wand2,
    title: "Bring a photo",
    body: "Drop it on the artboard. It fills the frame, and its colours are read for the palette and the contrast score.",
  },
  {
    icon: Sparkles,
    title: "Set the words",
    body: "Pick a template or start from a quote, an author line, a handle or a signature. Type, size and position are yours.",
  },
  {
    icon: RotateCcw,
    title: "Check it reads",
    body: "Select the text and the panel reports how it holds up against the worst part of the background, then offers colours that pass.",
  },
  {
    icon: Download,
    title: "Export it",
    body: "Square, portrait, story or widescreen, up to 3× resolution, as PNG or JPG, named after your document.",
  },
]

export default function LandingPage() {
  return (
    <>
      <span id="top" />
      <Nav />

      <main className="flex flex-col gap-26 pb-6 max-md:gap-16">
        <Hero />

        {/* ----------------------------------------- the live engine, up top */}
        <Container>
          <Module tone="dark" id="how">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-32 -right-24 size-[520px] rounded-full opacity-70 [background:radial-gradient(circle,var(--module-glow),transparent_64%)]"
            />
            <div className="relative">
              <ModuleHeading
                tone="dark"
                eyebrow="Running live on this page"
                title="It measures the part of the background your text actually fails on."
                body="A checker that averages the area behind the words will happily pass a quote crossing a bright cloud. This panel is not an illustration of that idea - it is the engine from the editor, reading the pixels behind the text as the light drifts across them."
              />
              <div className="mt-10">
                <LiveContrast />
              </div>
            </div>
          </Module>
        </Container>

        {/* ------------------------------------------------ how it works */}
        <Container>
          <Module tone="raised">
            <ModuleHeading
              eyebrow="Four steps, about a minute"
              title="From a photograph to a poster that reads."
              body="No sign-up, no file management, no export settings to decode. The editor opens on a blank artboard and everything else follows from the photo you drop on it."
            />

            <RevealGroup className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, index) => (
                <RevealItem key={step.title}>
                  {/*
                    A rule between the steps rather than a box around each. Four
                    columns of grey text with nothing between them run together -
                    the eye cannot tell where one step ends, which is the thing
                    that made this section hard to read. The first has no rule, so
                    the row does not start with a stray line.
                  */}
                  <div
                    className={
                      index === 0
                        ? "flex flex-col"
                        : "flex flex-col border-t border-border pt-7 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8"
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-subtle text-[var(--text-secondary)]">
                        <step.icon size={15} aria-hidden="true" />
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-bold tracking-[-0.01em]">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {step.body}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </Module>
        </Container>

        {/* ------------------------------------------------- what is in it */}
        <Container>
          <Module tone="paper" id="features" className="px-0">
            <ModuleHeading
              eyebrow="What is in it"
              title="Every part earns its place."
              body="The editor is deliberately small. These are the pieces that make a quote over a photograph look composed rather than assembled."
            />
            <div className="mt-9">
              <Bento />
            </div>
          </Module>
        </Container>

        {/* -------------------------------------- templates and guides, live */}
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            <Module tone="dark" id="templates">
              <ModuleHeading
                tone="dark"
                eyebrow="Templates"
                title="A template is a whole composition."
                body="Type, grade, grain and framing chosen together. Applying one is a starting point you then move - not a font you pick."
              />
              <div className="mt-8">
                <TemplateShowcase items={GALLERY} />
              </div>
            </Module>

            <Module tone="dark">
              <ModuleHeading
                tone="dark"
                eyebrow="Guides and snapping"
                title="Things land where you meant them to."
                body="Thirds, centre lines and a safe area, with a pull toward the guides, the other layers and the frame centre. The card below is being moved by the same solver the editor uses mid-drag."
              />
              <div className="mt-8">
                <LiveSnap />
              </div>
            </Module>
          </div>
        </Container>

        {/* ------------------------------------------- grain and grade, live */}
        <Container>
          <Module tone="dark">
            <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-12">
              <div>
                <ModuleHeading
                  tone="dark"
                  eyebrow="Grain and grade"
                  title="Effects that reach the file."
                  body="Film grain used to live in an overlay only the screen could see, so every export came out clean. Both effects here run from the editor's own code - the grain tile the export composites, and the same colour matrix Fabric applies."
                />
                <div className="mt-8">
                  <LiveGrade item={GALLERY[5] ?? GALLERY[1]} />
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:pl-4">
                {[
                  {
                    title: "The grain is a tile, not a filter",
                    body: "A generated texture at a fixed amplitude, blended the same way on screen and on export. That is why the grain you can see on the demo is the grain the file contains, at the same 28.",
                  },
                  {
                    title: "The grade is one matrix",
                    body: "Duotone maps luminance between two colours with a 4×5 transform. The demo hands that matrix straight to the browser, which is the same transform the canvas applies.",
                  },
                  {
                    title: "Everything is undoable",
                    body: "Grain, grade, vignette and letterbox sit in the document, so undo restores the panel and the artwork together rather than half of one.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-module-dark-border bg-module-dark-raised p-4"
                  >
                    <h3 className="text-[14px] font-bold text-on-module">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-on-module-muted">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Module>
        </Container>

        {/* ------------------------------------------------------- gallery */}
        <Container>
          <Module tone="raised" id="gallery">
            <ModuleHeading
              eyebrow="Gallery"
              title="Made with it, not mocked up."
              body="Every image below came out of the editor: that template applied to that photograph at that canvas size, captured from the export the Download button renders. Nothing here is a screenshot of a design file."
            />
            <div className="mt-9">
              {/*
                All of `GALLERY`, not `slice(1)`. The hero used to render
                `GALLERY[0]` itself, so skipping it here was right; now that the
                hero shows a live render instead, the first image has to come
                from the gallery or it leaves the page entirely - and
                `scratch/verify-landing.mjs` counts distinct gallery files, so
                the page would come up one short.
              */}
              <Gallery items={GALLERY} />
            </div>
          </Module>
        </Container>

        {/* ---------------------------------------------------- why it exists */}
        <Container>
          <Module tone="dark">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
              <ModuleHeading
                tone="dark"
                eyebrow="Why it exists"
                title="Text over a photo is the most common way to make something unreadable."
                body="The words are the point, and they are usually the last thing anyone checks. Subtext puts the measurement in the loop, so the decision about colour and contrast is made while you can still change it - instead of after somebody cannot read your post."
              />

              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: Grid2x2,
                    title: "The background is the problem, not the text",
                    body: "A photo has no single colour behind your words. The engine reads the region the text crosses and reports against its extremes.",
                  },
                  {
                    icon: Sparkles,
                    title: "Outline and shadow count",
                    body: "They are readability mechanisms, and the score credits them - but only as far as they actually hold up the text.",
                  },
                  {
                    icon: Download,
                    title: "The measurement survives the export",
                    body: "Grain, grade and framing are composited into the file. What the panel measured is what the download contains.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-3.5 rounded-2xl border border-module-dark-border bg-module-dark-raised p-4"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/6 text-on-module">
                      <item.icon size={14} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-[14px] font-bold text-on-module">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-on-module-muted">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Module>
        </Container>

        {/* ------------------------------------------------------------ cta */}
        <Container>
          <Reveal>
            <Module tone="dark" id="privacy" className="text-center">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[280px] opacity-80 [background:radial-gradient(58%_100%_at_50%_100%,var(--module-glow),transparent_70%)]"
              />
              <div className="relative">
                <ModuleHeading
                  align="center"
                  tone="dark"
                  eyebrow="Free, and it stays that way"
                  title="Open it and make something worth reading."
                  body="No sign-up, no upload, no cost. Your photograph is read in the tab you are looking at, and your work is saved on your own device."
                />
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    size="lg"
                    className="h-11 rounded-full px-6 text-[14px]"
                    nativeButton={false}
                    render={<Link href="/editor" />}
                  >
                    Open the editor
                  </Button>
                  <a
                    href="#gallery"
                    className="rounded-full px-4 py-2.5 text-[14px] font-medium text-on-module-muted transition-colors outline-none hover:bg-white/6 hover:text-on-module focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Look at the gallery again
                  </a>
                </div>
              </div>
            </Module>
          </Reveal>
        </Container>
      </main>

      <SiteFooter />
    </>
  )
}
