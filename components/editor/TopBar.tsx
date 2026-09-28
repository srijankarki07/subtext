"use client"

import { useEffect, useState } from "react"
import {
  Check,
  Download,
  FolderOpen,
  MoreHorizontal,
  Redo2,
  Save,
  Settings2,
  Trash2,
  Undo2,
} from "lucide-react"

import HistoryDropdown from "@/components/editor/HistoryDropdown"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
 * Secondary document actions.
 *
 * These live in a menu rather than on the bar itself — DESIGN/ §5 asks for a
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
    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] outline-none transition-colors hover:bg-black/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"

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
 * Export is the only strongly emphasised control — everything else is a ghost
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

  const [justSaved, setJustSaved] = useState(false)
  const [ratioSelection, setRatioSelection] = useState("")
  const [customW, setCustomW] = useState(1080)
  const [customH, setCustomH] = useState(1080)

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
        await loadProjectFromStorage()
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

  // Honest state: `lastSavedAt` only ever said "a save happened at some point",
  // so the badge stayed green after further edits.
  const unsaved = isDirty || (!hasSavedProject && !justSaved)
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
            "outline-none transition-colors hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus:text-foreground sm:w-[140px]"
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
            className="w-auto min-w-[104px] text-[11px] lg:min-w-[124px]"
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
