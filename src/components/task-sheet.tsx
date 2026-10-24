"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CheckIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  CATEGORIES,
  CATEGORY_IDS,
  downloadTaskIcs,
  todayISO,
  type CategoryId,
  type Task,
  type TaskDraft,
} from "@/lib/tasks"
import { cn } from "cn"

export function TaskSheet({
  open,
  onOpenChange,
  initial,
  defaultCategory,
  onSave,
  onDelete,
  onToggleDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: Task | null
  defaultCategory: CategoryId
  onSave: (draft: TaskDraft) => void
  onDelete: (id: string) => void
  onToggleDone: (task: Task) => void
}) {
  const titleId = useId()
  const dateId = useId()
  const notesId = useId()
  const titleRef = useRef<HTMLInputElement>(null)
  const wasOpen = useRef(false)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [category, setCategory] = useState<CategoryId>(defaultCategory)
  const [dueDate, setDueDate] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [calendarHint, setCalendarHint] = useState("")

  useEffect(() => {
    if (open && !wasOpen.current) {
      setTitle(initial?.title ?? "")
      setNotes(initial?.notes ?? "")
      setCategory(initial?.category ?? defaultCategory)
      setDueDate(initial?.dueDate ?? todayISO())
      setConfirmDelete(false)
      setCalendarHint("")
      const focusTimer = window.setTimeout(() => titleRef.current?.focus(), 250)
      wasOpen.current = true
      return () => window.clearTimeout(focusTimer)
    }
    if (!open) wasOpen.current = false
  }, [open, initial, defaultCategory])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || !dueDate) return
    onSave({
      title: trimmed,
      notes: notes.trim(),
      category,
      dueDate,
    })
  }

  const editing = initial !== null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[85dvh] overflow-y-auto rounded-t-3xl px-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto w-full max-w-lg">
          <SheetHeader className="flex-row items-start justify-between gap-3 px-4 pt-5">
            <div className="space-y-1">
              <SheetTitle className="font-heading text-2xl">
                {editing ? "Edit task" : "New task"}
              </SheetTitle>
              <SheetDescription>
                Pick a lane and the day it is due.
              </SheetDescription>
            </div>
            <SheetClose
              render={<Button type="button" variant="ghost" size="icon" aria-label="Close" />}
            >
              <XIcon />
            </SheetClose>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor={titleId}>Task</Label>
              <Input
                ref={titleRef}
                id={titleId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Call the school"
                maxLength={140}
                autoComplete="off"
                autoCapitalize="sentences"
                enterKeyHint="done"
                required
                className="h-12 text-base md:text-base"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Lane</legend>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORY_IDS.map((id) => {
                  const lane = CATEGORIES[id]
                  const selected = category === id
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setCategory(id)}
                      className={cn(
                        "flex min-h-16 flex-col items-start justify-center rounded-2xl border px-3 py-2 text-left transition-colors",
                        selected
                          ? cn(lane.chip, "border-transparent")
                          : "border-border bg-background text-foreground"
                      )}
                    >
                      <span className="text-sm font-semibold">{lane.label}</span>
                      <span
                        className={cn(
                          "mt-0.5 text-xs leading-snug",
                          selected ? "opacity-80" : "text-muted-foreground"
                        )}
                      >
                        {id === "now" ? "Red" : id === "late" ? "Yellow" : "Green"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor={dateId}>Due date</Label>
              <Input
                id={dateId}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
                className="h-12 text-base md:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={notesId}>Note</Label>
              <Textarea
                id={notesId}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything you need to remember"
                maxLength={1000}
                rows={3}
                className="min-h-24 text-base md:text-base"
              />
            </div>

            <Button
              type="submit"
              disabled={!title.trim() || !dueDate}
              className="h-12 rounded-2xl text-base"
            >
              {editing ? "Save changes" : "Add task"}
            </Button>

            {editing && (
              <Button
                type="button"
                variant={initial.done ? "outline" : "secondary"}
                className="h-12 rounded-2xl text-base"
                onClick={() => onToggleDone(initial)}
              >
                <CheckIcon />
                {initial.done ? "Move back to open" : "Mark done"}
              </Button>
            )}

            {editing && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-2xl text-base"
                  onClick={() => {
                    const ok = downloadTaskIcs({
                      ...initial,
                      title: title.trim() || initial.title,
                      notes: notes.trim(),
                      category,
                      dueDate: dueDate || initial.dueDate,
                    })
                    setCalendarHint(
                      ok
                        ? "Opened a calendar file. On iPhone, open it and choose Add to Calendar."
                        : "Couldn’t create a calendar file on this phone."
                    )
                  }}
                >
                  Add due date to Calendar
                </Button>
                {calendarHint && (
                  <p className="text-sm text-muted-foreground">{calendarHint}</p>
                )}
              </div>
            )}

            {editing && !confirmDelete && (
              <Button
                type="button"
                variant="destructive"
                className="h-12 rounded-2xl text-base"
                onClick={() => setConfirmDelete(true)}
              >
                Delete task
              </Button>
            )}

            {editing && confirmDelete && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm">Delete “{initial.title}”? It is gone from this phone.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep it
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-11"
                    onClick={() => onDelete(initial.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
