"use client"

import * as React from "react"

/**
 * The theme.
 *
 * This replaces `next-themes`, which did the same job but rendered its script
 * through React in a client component - and React 19 warns about that on every
 * page load: "Encountered a script tag while rendering React component. Scripts
 * inside React components are never executed when rendering on the client."
 *
 * The warning was the only console error in the app, it appeared on the editor
 * and the landing page alike, and it was reported as a bug. It is not actionable
 * *within* next-themes: the package has to inject that script, and React has to
 * complain about where it is injected. So the fix is to own the twenty lines
 * ourselves - see `components/theme-script.tsx` for the half that must not be a
 * client component.
 *
 * What is preserved, deliberately - these are the reasons the dependency was
 * worth having in the first place:
 *
 * - **No flash of the wrong theme.** The class is on `<html>` from the parsed
 *   HTML, before the app's own markup is painted.
 * - **The system preference is followed** until the user chooses, and changes to
 *   it are picked up live while the setting is `system`.
 * - **The switch does not animate.** `disableTransitionOnChange` in next-themes;
 *   here it is one injected stylesheet removed after two animation frames, which
 *   is what stops every `transition-colors` in the app from cross-fading.
 *
 * The storage key stays `theme`, so an existing choice survives the swap.
 */

export type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

const STORAGE_KEY = "theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = React.useContext(ThemeContext)
  if (!value) throw new Error("useTheme must be used inside a ThemeProvider")
  return value
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts as "system" and is corrected on mount from storage. The *document*
  // is already correct either way, because the script ran before paint.
  const [theme, setThemeState] = React.useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>("light")

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored)
    }
  }, [])

  React.useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches)
      document.documentElement.classList.toggle("dark", isDark)
      document.documentElement.style.colorScheme = isDark ? "dark" : "light"
      setResolvedTheme(isDark ? "dark" : "light")
    }

    apply()
    // Only while following the system: an explicit choice should not be
    // overridden by the OS changing under it.
    if (theme !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = React.useCallback((next: Theme) => {
    // Suppress transitions for one frame, or the whole UI cross-fades between
    // palettes. Removed after two frames so the next real transition works.
    const style = document.createElement("style")
    style.textContent = "*,*::before,*::after{transition:none !important}"
    document.head.appendChild(style)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // A blocked storage write should not stop the switch happening on screen.
    }
    setThemeState(next)
    requestAnimationFrame(() => requestAnimationFrame(() => style.remove()))
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
