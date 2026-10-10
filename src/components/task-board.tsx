"use client"

import { useMemo, useRef, useState, useSyncExternalStore } from "react"
import { CheckIcon, PlusIcon } from "lucide-react"

import { InstallHint } from "@/components/install-hint"
import { TaskSheet } from "@/components/task-sheet"
import { Button } from "@/components/ui/button"
import {
  getInstallSnapshot,
  getReadySnapshot,
  getServerInstallSnapshot,
  getServerReadySnapshot,
  getServerTaskSnapshot,
  getServerTodaySnapshot,
  getTaskSnapshot,
  getTodaySnapshot,
  replaceTasks,
  setInstallDismissed,
  subscribeInstall,
  subscribeReady,
  subscribeTasks,
  subscribeToday,
} from "@/lib/browser-state"
import {
  CATEGORIES,
  CATEGORY_IDS,
  compareTasks,
  createId,
  dueInfo,
  mergeTasks,
  openCount,
  overdueCount,
  parseBackup,
  type CategoryId,
  type LaneFilter,
  type Task,
  type TaskDraft,
} from "@/lib/tasks"
import { cn } from "cn"

export function TaskBoard() {
  const taskState = useSyncExternalStore(subscribeTasks, getTaskSnapshot, getServerTaskSnapshot)
  const install = useSyncExternalStore(
    subscribeInstall,
    getInstallSnapshot,
    getServerInstallSnapshot
  )
  const today = useSyncExternalStore(subscribeToday, getTodaySnapshot, getServerTodaySnapshot)
  const ready = useSyncExternalStore(subscribeReady, getReadySnapshot, getServerReadySnapshot)
  const tasks = taskState.tasks
  const persisted = taskState.persisted
  const [filter, setFilter] = useState<LaneFilter>("all")
  const [showDone, setShowDone] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [status, setStatus] = useState("")
  const [importError, setImportError] = useState("")
  const [pendingImport, setPendingImport] = useState<Task[] | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const openTasks = useMemo(
    () => tasks.filter((task) => !task.done).sort(compareTasks),
    [tasks]
  )
  const doneTasks = useMemo(
    () => tasks.filter((task) => task.done).sort(compareTasks),
    [tasks]
  )

  function commit(next: Task[], message: string) {
    replaceTasks(next)
    setStatus(message)
  }

  function openNew() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setSheetOpen(true)
  }

  function handleSave(draft: TaskDraft) {
    const now = new Date().toISOString()
    if (editing) {
      const next = tasks.map((task) =>
        task.id === editing.id ? { ...task, ...draft, updatedAt: now } : task
      )
      commit(next, `Saved ${draft.title} in ${CATEGORIES[draft.category].label}.`)
    } else {
      const task: Task = {
        id: createId(),
        ...draft,
        done: false,
        createdAt: now,
        updatedAt: now,
      }
      commit([task, ...tasks], `Added ${draft.title} to ${CATEGORIES[draft.category].label}.`)
      window.setTimeout(() => {
        document.querySelector(`[data-task-id="${task.id}"]`)?.scrollIntoView({ block: "nearest" })
      }, 50)
    }
    if (filter !== "all") setFilter(draft.category)
    setSheetOpen(false)
    setEditing(null)
  }

  function handleDelete(id: string) {
    const task = tasks.find((item) => item.id === id)
    commit(
      tasks.filter((item) => item.id !== id),
      task ? `Deleted ${task.title}.` : "Deleted the task."
    )
    setSheetOpen(false)
    setEditing(null)
  }

  function toggleDone(task: Task) {
    const now = new Date().toISOString()
    commit(
      tasks.map((item) =>
        item.id === task.id ? { ...item, done: !item.done, updatedAt: now } : item
      ),
      task.done ? `Moved ${task.title} back to open.` : `Finished ${task.title}.`
    )
  }

  function dismissInstall() {
    setInstallDismissed(true)
  }

  function exportList() {
    const blob = new Blob([JSON.stringify({ version: 1, tasks }, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `3-lists-${today}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setStatus("Exported your list.")
  }

  async function onImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const parsed = parseBackup(await file.text())
      if (!parsed) {
        setPendingImport(null)
        setImportError("That file doesn’t look like a 3 Lists backup.")
        return
      }
      setImportError("")
      setPendingImport(parsed)
    } catch {
      setImportError("That file couldn’t be read.")
    }
  }

  function applyImport(mode: "merge" | "replace") {
    if (!pendingImport) return
    const next = mode === "replace" ? pendingImport : mergeTasks(tasks, pendingImport)
    commit(
      next,
      mode === "replace"
        ? `Replaced your list with ${pendingImport.length} tasks.`
        : `Added ${pendingImport.length} tasks from the backup.`
    )
    setPendingImport(null)
  }

  const visibleOpen =
    filter === "all" ? openTasks : openTasks.filter((task) => task.category === filter)
  const visibleDone =
    filter === "all" ? doneTasks : doneTasks.filter((task) => task.category === filter)
  const defaultCategory: CategoryId = filter === "all" ? "now" : filter
  const openTotal = openCount(tasks, filter)
  const lateTotal = overdueCount(tasks, today, filter)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
          <div>
            <h1 className="font-heading text-[2rem] leading-none tracking-tight">3 Lists</h1>
            <p className="mt-1 text-sm text-muted-foreground">Now, Late, and Later</p>
            <p className="mt-2 text-sm">
              <span className="font-medium">
                {ready ? (openTotal === 1 ? "1 open" : openTotal === 0 ? "All clear" : `${openTotal} open`) : "Loading"}
              </span>
              {ready && lateTotal > 0 && (
                <span className="text-red-700 dark:text-red-300">
                  {" "}
                  · {lateTotal === 1 ? "1 overdue" : `${lateTotal} overdue`}
                </span>
              )}
            </p>
          </div>
          {!install.standalone && install.dismissed && ready && (
            <Button
              type="button"
              variant="outline"
              className="mt-1 h-10 shrink-0 rounded-full px-3"
              onClick={() => setInstallDismissed(false)}
            >
              Add to iPhone
            </Button>
          )}
        </div>
        <div className="grid h-1.5 grid-cols-3" aria-hidden="true">
          <div className="bg-red-600" />
          <div className="bg-yellow-400" />
          <div className="bg-green-600" />
        </div>
        <div className="grid grid-cols-4 gap-1.5 px-4 py-3" role="tablist" aria-label="Lanes">
          <FilterTab
            label="All"
            count={ready ? openCount(tasks) : null}
            selected={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {CATEGORY_IDS.map((id) => (
            <FilterTab
              key={id}
              label={CATEGORIES[id].label}
              count={ready ? openCount(tasks, id) : null}
              selected={filter === id}
              tone={id}
              onClick={() => setFilter(id)}
            />
          ))}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-32">
        <p className="sr-only" aria-live="polite">
          {status}
        </p>

        {!persisted && ready && (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm" role="alert">
            This browser isn’t saving the list. Tasks will disappear when you leave.
          </p>
        )}

        {ready && !install.standalone && !install.dismissed && (
          <InstallHint kind={install.kind} onDismiss={dismissInstall} />
        )}

        {!ready && (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          </div>
        )}

        {ready && visibleOpen.length === 0 && (
          <EmptyState filter={filter} />
        )}

        {ready && filter === "all" && visibleOpen.length > 0 &&
          CATEGORY_IDS.map((id) => {
            const laneTasks = visibleOpen.filter((task) => task.category === id)
            if (laneTasks.length === 0) return null
            return (
              <Lane
                key={id}
                category={id}
                tasks={laneTasks}
                today={today}
                onToggle={toggleDone}
                onEdit={openEdit}
              />
            )
          })}

        {ready && filter !== "all" && visibleOpen.length > 0 && (
          <Lane
            category={filter}
            tasks={visibleOpen}
            today={today}
            onToggle={toggleDone}
            onEdit={openEdit}
          />
        )}

        {ready && visibleDone.length > 0 && (
          <section className="mt-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-xl">Finished</h2>
              <Button
                type="button"
                variant="ghost"
                className="h-10"
                onClick={() => setShowDone((value) => !value)}
                aria-expanded={showDone}
              >
                {showDone ? "Hide" : `Show ${visibleDone.length}`}
              </Button>
            </div>
            {showDone && (
              <div className="mt-2 space-y-2">
                <ul className="space-y-2">
                  {visibleDone.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      today={today}
                      onToggle={toggleDone}
                      onEdit={openEdit}
                    />
                  ))}
                </ul>
                {confirmClear ? (
                  <div className="rounded-2xl border px-3 py-3">
                    <p className="text-sm">
                      Remove {visibleDone.length} finished{" "}
                      {visibleDone.length === 1 ? "task" : "tasks"} from this phone?
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() => setConfirmClear(false)}
                      >
                        Keep them
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-11"
                        onClick={() => {
                          const ids = new Set(visibleDone.map((task) => task.id))
                          commit(
                            tasks.filter((task) => !ids.has(task.id)),
                            `Cleared ${visibleDone.length} finished tasks.`
                          )
                          setConfirmClear(false)
                          setShowDone(false)
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-2xl"
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear finished
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {ready && (
          <details className="rounded-2xl border bg-card px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">Backup this phone’s list</summary>
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Tasks are saved in this browser only. Export a file before you clear Safari
                data. On iPhone, the download opens the share sheet so you can store it in Files.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl"
                onClick={exportList}
                disabled={tasks.length === 0}
              >
                Export list
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl"
                onClick={() => fileRef.current?.click()}
              >
                Import a backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={onImportFile}
              />
              {importError && <p className="text-sm text-destructive">{importError}</p>}
              {pendingImport && (
                <div className="rounded-2xl bg-muted p-3">
                  <p className="text-sm">
                    This backup has {pendingImport.length}{" "}
                    {pendingImport.length === 1 ? "task" : "tasks"}.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button type="button" className="h-11 rounded-2xl" onClick={() => applyImport("merge")}>
                      Add to my list
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-11 rounded-2xl"
                      onClick={() => applyImport("replace")}
                    >
                      Replace my list
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11"
                      onClick={() => setPendingImport(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" onClick={openNew} className="h-12 w-full rounded-2xl text-base">
            <PlusIcon />
            Add a task
          </Button>
        </div>
      </footer>

      <TaskSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setEditing(null)
        }}
        initial={editing}
        defaultCategory={defaultCategory}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}

function FilterTab({
  label,
  count,
  selected,
  tone,
  onClick,
}: {
  label: string
  count: number | null
  selected: boolean
  tone?: CategoryId
  onClick: () => void
}) {
  const lane = tone ? CATEGORIES[tone] : null
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 text-sm transition-colors",
        selected
          ? lane
            ? lane.chip
            : "bg-primary text-primary-foreground"
          : "bg-muted text-foreground"
      )}
    >
      <span className="font-medium">{label}</span>
      <span className={cn("text-xs tabular-nums", selected ? "opacity-80" : "text-muted-foreground")}>
        {count === null ? "·" : count}
      </span>
    </button>
  )
}

function EmptyState({ filter }: { filter: LaneFilter }) {
  if (filter === "all") {
    return (
      <section className="rounded-3xl border border-dashed px-4 py-8">
        <h2 className="font-heading text-2xl tracking-tight">Nothing is waiting.</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {CATEGORY_IDS.map((id) => {
            const lane = CATEGORIES[id]
            return (
              <li key={id} className="flex items-start gap-3">
                <span className={cn("mt-1 size-3 shrink-0 rounded-full", lane.bar)} aria-hidden="true" />
                <span>
                  <span className="font-medium">{lane.label}</span>
                  <span className="text-muted-foreground"> — {lane.hint.toLowerCase()}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">Every task gets a due date.</p>
      </section>
    )
  }

  const lane = CATEGORIES[filter]
  return (
    <section className={cn("rounded-3xl px-4 py-8", lane.soft)}>
      <h2 className={cn("font-heading text-2xl", lane.ink)}>{lane.emptyTitle}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{lane.emptyBody}</p>
    </section>
  )
}

function Lane({
  category,
  tasks,
  today,
  onToggle,
  onEdit,
}: {
  category: CategoryId
  tasks: Task[]
  today: string
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
}) {
  const lane = CATEGORIES[category]
  return (
    <section aria-labelledby={`lane-${category}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id={`lane-${category}`} className="flex items-center gap-2 font-heading text-xl">
          <span className={cn("size-2.5 rounded-full", lane.bar)} aria-hidden="true" />
          {lane.label}
        </h2>
        <span className="text-sm text-muted-foreground">{tasks.length}</span>
      </div>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} today={today} onToggle={onToggle} onEdit={onEdit} />
        ))}
      </ul>
    </section>
  )
}

function TaskCard({
  task,
  today,
  onToggle,
  onEdit,
}: {
  task: Task
  today: string
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
}) {
  const lane = CATEGORIES[task.category]
  const due = dueInfo(task.dueDate, today)
  return (
    <li data-task-id={task.id} className="list-none">
      <article
        className={cn(
          "flex overflow-hidden rounded-2xl border shadow-sm",
          task.done ? "bg-card opacity-75" : lane.soft
        )}
      >
        <div className={cn("w-1.5 shrink-0", lane.bar)} aria-hidden="true" />
        <button
          type="button"
          onClick={() => onToggle(task)}
          aria-pressed={task.done}
          aria-label={task.done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
          className="flex size-12 shrink-0 items-center justify-center"
        >
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full border-2",
              task.done ? lane.check : cn("border-current bg-transparent", lane.ink)
            )}
          >
            {task.done && <CheckIcon className="size-3.5" />}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="flex-1 py-3 pr-3 text-left"
        >
          <p className={cn("text-base leading-snug font-medium", task.done && "text-muted-foreground line-through")}>
            {task.title}
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              due.overdue && !task.done
                ? "font-medium text-red-700 dark:text-red-300"
                : "text-muted-foreground"
            )}
          >
            {due.label} · {due.date}
          </p>
          {task.notes && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.notes}</p>
          )}
        </button>
      </article>
    </li>
  )
}
