/*
 * Applies the stored theme before anything is painted.
 *
 * A file in `public/` rather than an inline `<script>`, and that is the whole
 * point. Three approaches were tried and measured:
 *
 *   1. `next-themes` — did this correctly, but rendered its script through React
 *      in a client component, so React 19 logged a warning on every page load.
 *   2. An inline `<script>` from the layout — React warns about those too, server
 *      component or not: it cannot know the script will execute, and on a client
 *      render it would not.
 *   3. `next/script` with inline children — hydrated differently on the two
 *      sides: the server emitted the polyfill script, the client expected its
 *      `__next_s` queue, and React reported an attribute mismatch.
 *
 * Loaded through `next/script` with `strategy="beforeInteractive"`, which is the
 * documented mechanism for this: "injected into the initial HTML from the server,
 * downloaded before any Next.js module, and executed in the order they are
 * placed". A preloaded 400-byte same-origin file is a fair price for a first
 * paint in the right theme, and it is the only one of the four that is both
 * flash-free and silent.
 *
 * Plain ES5 on purpose: it runs before any polyfill, in browsers that may not
 * have `matchMedia` at the moment it executes.
 */
(function () {
  try {
    var theme = localStorage.getItem("theme") || "system";
    var prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (error) {
    /* A blocked localStorage read should not stop the page rendering. */
  }
})();
