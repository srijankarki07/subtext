"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import LogoIcon from "@/public/assets/logo-icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The navigation bar.
 *
 * A floating pill rather than a full-width bar, following the reference: the
 * links sit in their own rounded container, so the bar reads as a floating
 * object over the page rather than as a strip of chrome across it. It starts
 * transparent and gains a surface once the page has scrolled, which keeps the
 * hero clean and the links legible over content.
 */

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#gallery", label: "Gallery" },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3 sm:pt-4">
      <div className="mx-auto w-full max-w-[800px] px-5 sm:px-6 lg:px-8">
        <motion.nav
          animate={
            reduced
              ? undefined
              : { y: scrolled ? 0 : 0, scale: scrolled ? 0.985 : 1 }
          }
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 transition-colors duration-300 sm:px-4",
            scrolled
              ? "border-border bg-background/80 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.16)] backdrop-blur-xl"
              : "border-transparent bg-transparent"
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <LogoIcon className="h-5 w-auto" />
            <span className="text-[15px] font-bold tracking-[-0.01em]">
              Subtext
            </span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-full px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors outline-none hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            className="rounded-full px-3.5"
            nativeButton={false}
            render={<Link href="/editor" />}
          >
            Open editor
          </Button>
        </motion.nav>
      </div>
    </header>
  )
}
