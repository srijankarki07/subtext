"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Theme provider.
 *
 * `next-themes` is used for system-preference following, persistence and — the
 * reason it is worth a dependency — setting the class *before* first paint, so
 * there is no flash of the wrong theme.
 *
 * This was removed during Pass 1: at the time the app was single-theme and the
 * provider existed only to toggle a dark palette that had been deleted, and it
 * shipped an undocumented bare `d` hotkey that could swap the theme mid-edit.
 * The hotkey is deliberately not reinstated; the theme is changed from the top
 * bar control only.
 */
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
