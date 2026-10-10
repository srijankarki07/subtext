"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/components/theme-provider"
import {
  Check,
  Columns2,
  Download,
  FolderOpen,
  Moon,
  MoreHorizontal,
  Redo2,
  Save,
  Settings2,
  Sun,
  Trash2,
  Undo2,
} from "lucide-react"

import HistoryDropdown from "@/components/editor/HistoryDropdown"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASPECT_RATIOS, useEditorStore } from "@/store/useEditorStore"
import { cn } from "@/lib/utils"

/**
 * Theme switch.
 *
 * Renders nothing until mounted: the server cannot know the resolved theme, so
 * rendering an icon on the server would either mismatch on hydration or flash
 * the wrong one. The placeholder keeps the top bar from reflowing when it
 * appears.
 */
/**
 * Before and after, from the top bar.
 *
 * The same label as the command palette entry and the focus bar's button, so the
 * one feature reads as one feature wherever it is met. It is offered only when
 * there is a photograph: with no image, grading cannot have changed anything, and
 * a control that does nothing is worse than an absent one.
 */
function CompareToggle() {
  const canvas = useEditorStore((s) => s.canvas)
  const isComparing = useEditorStore((s) => s.isComparing)
  const setComparing = useEditorStore((s) => s.setComparing)
  const [hasPhoto, setHasPhoto] = useState(false)

  useEffect(() => {
    if (!canvas) return
    const check = () =>
      setHasPhoto(
        canvas
          .getObjects()
          .some(
            (object) =>
              object.type === "image" &&
              !(object as { isEffect?: boolean }).isEffect
          )
      )
    check()
    canvas.on("object:added", check)
    canvas.on("object:removed", check)
    return () => {
      canvas.off("object:added", check)
      canvas.off("object:removed", check)
    }
  }, [canvas])

  if (!hasPhoto) return null

  return (
    <IconButton
      icon={<Columns2 size={15} />}
      label={isComparing ? "Hide the comparison" : "Compare with the original"}
      active={isComparing}
      onClick={() => setComparing(!isComparing)}
    />
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <span aria-hidden="true" className="size-8" />

  const isDark = resolvedTheme === "dark"

  return (
    <IconButton
      icon={isDark ? <Sun size={15} /> : <Moon size={15} />}
      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    />
  )
}

/**
 * Secondary document actions.
 *
 * These live in a menu rather than on the bar itself - DESIGN/ §5 asks for a
 * quiet top bar, and "start over" and "delete the saved project" are both rare
 * and destructive. Both previously existed in the store with no way to reach
 * them.
 */
function DocumentMenu() {
  const [open, setOpen] = useState(false)
  const hasSavedProject = useEditorStore((s) => s.hasSavedProject)
  const clearCanvas = useEditorStore((s) => s.clearCanvas)
  const clearSavedProject = useEditorStore((s) => s.clearSavedProject)
  const setConfirmDialog = useEditorStore((s) => s.setConfirmDialog)

  const item =
    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] outline-none transition-colors hover:bg-subtle-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <IconButton
            icon={<MoreHorizontal size={15} />}
            label="More document actions"
            active={open}
          />
        }
      />
      <PopoverContent align="end" className="w-[228px]">
        <button
          type="button"
          className={item}
          onClick={() => {
            setOpen(false)
            setConfirmDialog({
              title: "Start a new canvas?",
              message:
                "This clears the artboard and its layers. Your saved project, if any, is not affected.",
              confirmText: "New canvas",
              onConfirm: () => clearCanvas(),
            })
          }}
        >
          <Trash2 size={14} className="text-[var(--text-muted)]" />
          New canvas
        </button>

        <button
          type="button"
          disabled={!hasSavedProject}
          className={cn(
            item,
            "disabled:pointer-events-none disabled:opacity-40"
          )}
          onClick={() => {
            setOpen(false)
            setConfirmDialog({
              title: "Delete saved project?",
              message:
                "The copy stored in this browser will be removed. Anything currently on the artboard stays put.",
              confirmText: "Delete",
              onConfirm: () => clearSavedProject(),
            })
          }}
        >
          <FolderOpen size={14} className="text-[var(--text-muted)]" />
          Delete saved project
        </button>
      </PopoverContent>
    </Popover>
  )
}

/**
 * The top bar carries global actions only.
 *
 * DESIGN/ §5: the bar stays quiet. Document identity sits on the left, and
 * Export is the only strongly emphasised control - everything else is a ghost
 * or icon button. Restore is de-emphasised rather than advertised; it lives
 * next to Save as a tertiary action.
 */
export default function TopBar({
  isInspectorOpen,
  onToggleInspector,
}: {
  isInspectorOpen: boolean
  onToggleInspector: () => void
}) {
  const setConfirmDialog = useEditorStore((s) => s.setConfirmDialog)
  const setAspectRatio = useEditorStore((s) => s.setAspectRatio)
  const setIsExportModalOpen = useEditorStore((s) => s.setIsExportModalOpen)
  const saveProjectToStorage = useEditorStore((s) => s.saveProjectToStorage)
  const loadProjectFromStorage = useEditorStore((s) => s.loadProjectFromStorage)
  const hasSavedProject = useEditorStore((s) => s.hasSavedProject)
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt)
  const documentTitle = useEditorStore((s) => s.documentTitle)
  const setDocumentTitle = useEditorStore((s) => s.setDocumentTitle)
  const isDirty = useEditorStore((s) => s.isDirty)
  const artboard = useEditorStore((s) => s.artboard)

  const [justSaved, setJustSaved] = useState(false)
  const [ratioSelection, setRatioSelection] = useState("")
  const [customW, setCustomW] = useState(1080)
  const [customH, setCustomH] = useState(1080)

  // The control should describe the canvas that actually exists. It used to show
  // a "Canvas size" placeholder until the user picked something, and stayed
  // stale after restoring a project with a different ratio.
  useEffect(() => {
    const match = Object.entries(ASPECT_RATIOS).find(
      ([, ratio]) =>
        ratio.width === artboard.width && ratio.height === artboard.height
    )
    if (match) {
      setRatioSelection(match[0])
    } else {
      setRatioSelection("custom")
      setCustomW(artboard.width)
      setCustomH(artboard.height)
    }
  }, [artboard])

  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)

  const handleSave = () => {
    if (saveProjectToStorage()) {
      setJustSaved(true)
    }
  }

  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [justSaved])

  const handleRestore = () => {
    setConfirmDialog({
      title: "Restore project",
      message:
        "Restore the saved project from this browser? Current unsaved changes will be overwritten.",
      confirmText: "Restore",
      onConfirm: async () => {
        // The saved copy, not the autosaved document: pressing Restore is a
        // request for the thing the user deliberately kept.
        await loadProjectFromStorage("savedProject")
      },
    })
  }

  const handleRatioChange = (val: string) => {
    setRatioSelection(val)
    const preset = ASPECT_RATIOS[val as keyof typeof ASPECT_RATIOS]
    if (val !== "custom" && preset) {
      setAspectRatio(preset.width, preset.height)
    }
  }

  const applyCustomRatio = () => {
    if (customW > 100 && customH > 100) setAspectRatio(customW, customH)
  }

  /**
   * What the badge answers: "would I lose work if this tab died?"
   *
   * Not "have I pressed Save?" - that was the old rule, and it predates
   * autosave: it read as a warning whenever there was no *explicit* copy, even
   * though the document was written and would come back. `isDirty` already means
   * "there are changes not yet written", which is the only state that risks
   * anything. An explicit copy is a separate question, answered by the Save
   * button and the Restore button next to it.
   */
  const unsaved = isDirty
  const saved = !unsaved

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 select-none sm:px-4">
      {/* Document identity */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
          Subtext
        </span>
        <div className="h-4 w-px bg-border" />
        <input
          aria-label="Document title"
          value={documentTitle}
          onChange={(event) => setDocumentTitle(event.target.value)}
          placeholder="Untitled"
          className={cn(
            "w-[88px] min-w-0 rounded-md bg-transparent px-1 py-0.5 text-[13px] text-[var(--text-secondary)]",
            "transition-colors outline-none hover:bg-subtle-hover focus:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring sm:w-[140px]"
          )}
        />
        <span className="hidden items-center gap-1.5 text-[11px] text-[var(--text-muted)] sm:flex">
          {/* Status is never colour-only: the dot is paired with its label. */}
          <span
            className={cn(
              "size-1.5 rounded-full",
              saved ? "bg-emerald-600" : "bg-[var(--color-saffron)]"
            )}
          />
          {saved ? "Saved" : "Unsaved"}
        </span>
      </div>

      {/* History + persistence */}
      <div className="hidden items-center gap-0.5 lg:flex">
        <IconButton
          icon={<Undo2 size={15} />}
          label="Undo"
          disabled={!canUndo}
          onClick={() => useEditorStore.getState().undo()}
        />
        <IconButton
          icon={<Redo2 size={15} />}
          label="Redo"
          disabled={!canRedo}
          onClick={() => useEditorStore.getState().redo()}
        />
        <HistoryDropdown />
        <div className="mx-1.5 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          title={lastSavedAt ? `Saved at ${lastSavedAt}` : undefined}
        >
          {justSaved ? <Check size={14} /> : <Save size={14} />}
          <span>{justSaved ? "Saved" : "Save"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRestore}
          disabled={!hasSavedProject}
          title={
            hasSavedProject
              ? "Restore the saved project from this browser"
              : "No saved project yet"
          }
        >
          <FolderOpen size={14} />
          <span>Restore</span>
        </Button>
        <DocumentMenu />
      </div>

      {/* Canvas + output */}
      <div className="flex items-center gap-2">
        {ratioSelection === "custom" && (
          <div className="hidden items-center gap-1 rounded-lg border border-border bg-card p-1 sm:flex">
            <input
              type="number"
              aria-label="Canvas width"
              value={customW}
              onChange={(event) => setCustomW(Number(event.target.value))}
              className="w-12 rounded bg-transparent px-1 py-0.5 text-center text-[11px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
            />
            <span className="text-[10px] text-[var(--text-muted)]">×</span>
            <input
              type="number"
              aria-label="Canvas height"
              value={customH}
              onChange={(event) => setCustomH(Number(event.target.value))}
              className="w-12 rounded bg-transparent px-1 py-0.5 text-center text-[11px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
            />
            <Button variant="secondary" size="xs" onClick={applyCustomRatio}>
              Apply
            </Button>
          </div>
        )}

        <Select
          value={ratioSelection}
          onValueChange={(val) => handleRatioChange(val as string)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Canvas size"
            className="w-auto min-w-[118px] lg:min-w-[132px]"
          >
            <SelectValue placeholder="Canvas size" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(ASPECT_RATIOS).map((ratio) => (
              <SelectItem key={ratio} value={ratio}>
                {ratio}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom canvas</SelectItem>
          </SelectContent>
        </Select>

        {/* The single filled action in the app. */}
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsExportModalOpen(true)}
        >
          <Download size={14} />
          <span>Export</span>
        </Button>

        <CompareToggle />

        <ThemeToggle />

        <IconButton
          icon={<Settings2 size={15} />}
          label={isInspectorOpen ? "Hide inspector" : "Show inspector"}
          active={isInspectorOpen}
          onClick={onToggleInspector}
        />
      </div>
    </header>
  )
}
