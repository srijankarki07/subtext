"use client"

import { useEffect, useState } from "react"
import { Check, Download, FolderOpen, Redo2, Save, Settings2, Undo2 } from "lucide-react"

import HistoryDropdown from "@/components/editor/HistoryDropdown"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
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
  const {
    setConfirmDialog,
    setAspectRatio,
    setIsExportModalOpen,
    saveProjectToStorage,
    loadProjectFromStorage,
    hasSavedProject,
    lastSavedAt,
  } = useEditorStore()

  const [justSaved, setJustSaved] = useState(false)
  const [documentTitle, setDocumentTitle] = useState("Untitled")
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

  const saved = justSaved || Boolean(lastSavedAt)

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
        <span
          className={cn(
            "hidden items-center gap-1.5 text-[11px] sm:flex",
            saved ? "text-[var(--text-muted)]" : "text-[var(--text-muted)]"
          )}
        >
          {/* Status is never colour-only: the dot is paired with its label. */}
          <span
            className={cn(
              "size-1.5 rounded-full",
              saved ? "bg-emerald-600" : "bg-amber-500"
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
