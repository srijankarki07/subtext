# Contributing

Notes for working on Subtext. Short version: run `pnpm dev`, keep `lib/` free of
React, format before you push, and write commit subjects that say what changed.

## Setup

Node.js 20.9 or newer is required by Next.js 16; development happens on Node 24
with pnpm 10.

```bash
pnpm install
pnpm dev
```

The editor is at <http://localhost:3000/editor>.

## Before you push

```bash
pnpm format     # Prettier, including Tailwind class sorting
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
```

`pnpm build` is worth running for anything that touches imports, fonts or the
App Router — TypeScript alone will not catch a bad route export or a font that
fails to load.

## Where things go

| Directory     | Belongs there                                              |
| ------------- | ---------------------------------------------------------- |
| `app/`        | Routes only. Keep components out of here.                  |
| `components/` | React components, grouped by role (`panels`, `modals`, …). |
| `lib/`        | Plain TypeScript. No React, no DOM assumptions.            |
| `store/`      | Editor state, as slices composed in `useEditorStore`.      |
| `types/`      | Shared types for the store and templates.                  |

Two rules carry most of the weight. Logic in `lib/` must be importable and
testable without React — colour maths, filters and templates all live there for
that reason. And editor state belongs in the store, not in component state, so
that undo/redo and persistence see it; anything the user can change and expect
to undo should be a store action.

Canvas work goes through Fabric.js. If you are reaching for direct DOM
manipulation of the artboard, there is probably a Fabric API for it.

## Commits

Conventional Commits, with a scope naming the area:

```
feat(panels): a font picker with pairing suggestions
fix(export): grain was dropped on the way out
chore(tooling): editorconfig and a pinned Node version
docs(readme): a real README, since this still says Next.js template
```

The subject is lower case and describes the change rather than the file. If the
change needs justifying — a trade-off, a workaround, a bug that was not obvious
— put the reasoning in the body, not the subject.

## Branches and pull requests

Branch off `main` and prefix by intent: `feature/`, `fix/`, `chore/`, `docs/`,
`refactor/`. Keep names kebab-case and specific — `fix/duotone-colour-loop`
reads better than `fix/bug`.

Keep a pull request to one idea. A PR that renames a file _and_ rewrites the
colour engine is two PRs, because the first is one line to review and the second
is not. Describe what changed and why in the body; a reviewer should not have to
read the diff to find out what the PR is for.

If a change depends on another unmerged branch, say so in the PR body and base
the branch on that work rather than on `main`, so the diff shows only what is
new.

## Formatting

Prettier is the source of truth and `pnpm format` is the whole story: no
semicolons, double quotes, 2-space indent, 80 columns, trailing commas where ES5
allows them. Tailwind classes are sorted by `prettier-plugin-tailwindcss`
against `app/globals.css`.

Do not hand-format around Prettier, and do not reflow untouched code in a PR —
it buries the change.
