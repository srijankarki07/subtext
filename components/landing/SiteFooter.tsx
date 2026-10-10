import Link from "next/link"

import { Footer3 } from "@/components/ui/footer-3"
import LogoIcon from "@/public/assets/logo-icon"
import { Container } from "@/components/landing/Container"

/**
 * The page's footer, using the installed `Footer3` block.
 *
 * Two things are done here rather than in the block itself:
 *
 * - It is wrapped in the page's own `Container`, because the block brings its
 *   own `max-w-7xl` and the rest of the page measures 1248px. Two different
 *   measures on one page is the kind of detail that reads as sloppy without
 *   anyone being able to say why.
 * - The links are real destinations. The block accepts any groups, and inventing
 *   a "Company / Careers" column for a project that has neither would be the sort
 *   of filler that makes a page untrustworthy - so the columns that exist are the
 *   ones about the product itself.
 *
 * The logo is the brand mark, sized to sit with the wordmark rather than beside
 * a heading.
 */
export default function SiteFooter() {
  return (
    <Container className="pb-6">
      <Footer3
        logo={<LogoIcon className="h-5 w-auto" />}
        brandName="Subtext"
        description="A small editor for quotes over photographs. It measures whether the words are readable against the hardest part of the picture behind them, and helps you fix it when they are not."
        linkGroups={[
          {
            title: "The editor",
            links: [
              { label: "Open the editor", href: "/editor" },
              { label: "How it works", href: "#how" },
              { label: "Templates", href: "#templates" },
              { label: "Gallery", href: "#gallery" },
            ],
          },
          {
            title: "In the editor",
            links: [
              { label: "Readability engine", href: "#how" },
              { label: "Composition guides", href: "#features" },
              { label: "Export sizes", href: "#features" },
              { label: "What is in it", href: "#features" },
            ],
          },
          {
            title: "About",
            links: [
              { label: "Runs in your browser", href: "#privacy" },
              { label: "No account needed", href: "#privacy" },
              { label: "Your photos stay local", href: "#privacy" },
            ],
          },
        ]}
        copyright={`© ${new Date().getFullYear()} Subtext. Free to use.`}
        legalLinks={[
          { label: "Back to top", href: "#top" },
          { label: "Open the editor", href: "/editor" },
        ]}
      />

      {/*
        A quiet line under the block, because the block's own legal row is about
        links and this is a statement. Split out rather than crammed into the
        `legalLinks` list, where it would have to be a link to nowhere.
      */}
      <p className="mt-4 px-2 text-center text-[12px] text-[var(--text-muted)]">
        Subtext runs entirely in your browser.{" "}
        <Link
          href="/editor"
          className="text-[var(--text-secondary)] underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Nothing you make is uploaded anywhere.
        </Link>
      </p>
    </Container>
  )
}
