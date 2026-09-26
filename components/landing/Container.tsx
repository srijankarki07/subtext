import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The page's measure.
 *
 * Nothing on the landing page spans the viewport. Every section sits inside
 * 1248px with a gutter, and the modules inside that are inset again — which is
 * the whole point of the layout: content confined to a defined container reads
 * as composed, where edge-to-edge bands read as a brochure.
 *
 * 1248 rather than a rounder 1280 or 1440 because it is 12 columns of 88px with
 * 16px gutters, so a grid inside the container lands on whole column widths
 * instead of half-pixels.
 */
const MEASURE = "mx-auto w-full max-w-[1248px] px-5 sm:px-6 lg:px-8"

export function Container({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string
  children: React.ReactNode
  as?: "div" | "section" | "header" | "footer" | "nav"
}) {
  return <Tag className={cn(MEASURE, className)}>{children}</Tag>
}

export { MEASURE }
