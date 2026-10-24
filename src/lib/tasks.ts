export const CATEGORY_IDS = ["now", "late", "later"] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]
export type LaneFilter = "all" | CategoryId | "done"

export type Task = {
  id: string
  title: string
  notes: string
  category: CategoryId
  dueDate: string
  done: boolean
  createdAt: string
  updatedAt: string
}

export type TaskDraft = {
  title: string
  notes: string
  category: CategoryId
  dueDate: string
}

export type CategoryStyle = {
  id: CategoryId
  label: string
  hint: string
  emptyTitle: string
  emptyBody: string
  bar: string
  soft: string
  ink: string
  chip: string
  check: string
}

export const CATEGORIES: Record<CategoryId, CategoryStyle> = {
  now: {
    id: "now",
    label: "Now",
    hint: "What you should do next",
    emptyTitle: "Now is clear",
    emptyBody: "Put a task here when it can't wait.",
    bar: "bg-red-600",
    soft: "bg-red-50 dark:bg-red-950/40",
    ink: "text-red-800 dark:text-red-200",
    chip: "bg-red-600 text-white hover:bg-red-700",
    check: "bg-red-600 text-white",
  },
  late: {
    id: "late",
    label: "Late",
    hint: "What's already slipping",
    emptyTitle: "Late is clear",
    emptyBody: "Put a task here when it's behind.",
    bar: "bg-yellow-400",
    soft: "bg-yellow-50 dark:bg-yellow-950/35",
    ink: "text-yellow-950 dark:text-yellow-100",
    chip: "bg-yellow-400 text-yellow-950 hover:bg-yellow-300",
    check: "bg-yellow-400 text-yellow-950",
  },
  later: {
    id: "later",
    label: "Later",
    hint: "What's still ahead",
    emptyTitle: "Later is clear",
    emptyBody: "Put a task here when it can wait.",
    bar: "bg-green-600",
    soft: "bg-green-50 dark:bg-green-950/40",
    ink: "text-green-800 dark:text-green-200",
    chip: "bg-green-600 text-white hover:bg-green-700",
    check: "bg-green-600 text-white",
  },
}

export const STORAGE_KEY = "lists3.tasks.v1"
export const INSTALL_DISMISS_KEY = "lists3.install.dismissed"
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function todayISO(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function isRealDate(iso: string) {
  if (!DATE_RE.test(iso)) return false
  const [year, month, day] = iso.split("-").map(Number)
  const date = parseISODate(iso)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function dayDiff(fromISO: string, toISO: string) {
  const from = parseISODate(fromISO)
  const to = parseISODate(toISO)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

export type DueInfo = {
  label: string
  date: string
  overdue: boolean
}

export function dueInfo(iso: string, today = todayISO()): DueInfo {
  const due = parseISODate(iso)
  const now = parseISODate(today)
  const diff = dayDiff(today, iso)
  const date = due.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: due.getFullYear() === now.getFullYear() ? undefined : "numeric",
  })

  let label = `Due in ${diff} days`
  if (diff === 0) label = "Due today"
  else if (diff === 1) label = "Due tomorrow"
  else if (diff === -1) label = "Due yesterday"
  else if (diff < 0) label = `${Math.abs(diff)} days overdue`

  return { label, date, overdue: diff < 0 }
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && (CATEGORY_IDS as readonly string[]).includes(value)
}

export function normalizeTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const notes = typeof raw.notes === "string" ? raw.notes : ""
  const task: Task = {
    id: typeof raw.id === "string" ? raw.id : "",
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    notes: notes.trim(),
    category: raw.category as CategoryId,
    dueDate: typeof raw.dueDate === "string" ? raw.dueDate : "",
    done: raw.done === true,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  }
  if (!task.id || !task.title || task.title.length > 140) return null
  if (!isCategoryId(task.category) || !isRealDate(task.dueDate)) return null
  if (!task.createdAt || !task.updatedAt) return null
  if (task.notes.length > 1000) task.notes = task.notes.slice(0, 1000)
  return task
}

export function compareTasks(a: Task, b: Task) {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : 1
}

export function loadTasks(): { tasks: Task[]; persisted: boolean } {
  if (typeof window === "undefined") return { tasks: [], persisted: false }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { tasks: [], persisted: true }
    const parsed = JSON.parse(raw) as unknown
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { tasks?: unknown }).tasks)
        ? (parsed as { tasks: unknown[] }).tasks
        : null
    if (!list) return { tasks: [], persisted: true }
    return { tasks: list.map(normalizeTask).filter((task): task is Task => task !== null), persisted: true }
  } catch {
    return { tasks: [], persisted: false }
  }
}

export function saveTasks(tasks: Task[]) {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, tasks })
    )
    return true
  } catch {
    return false
  }
}

export function mergeTasks(current: Task[], incoming: Task[]) {
  const map = new Map(current.map((task) => [task.id, task]))
  for (const task of incoming) map.set(task.id, task)
  return [...map.values()]
}

export function parseBackup(raw: string): Task[] | null {
  try {
    const data = JSON.parse(raw) as unknown
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { tasks?: unknown }).tasks)
        ? (data as { tasks: unknown[] }).tasks
        : null
    if (!list) return null
    const tasks = list.map(normalizeTask).filter((task): task is Task => task !== null)
    return tasks.length > 0 ? tasks : null
  } catch {
    return null
  }
}

export function openCount(tasks: Task[], filter: LaneFilter = "all") {
  if (filter === "done") return 0
  return tasks.filter(
    (task) => !task.done && (filter === "all" || task.category === filter)
  ).length
}

export function doneCount(tasks: Task[]) {
  return tasks.filter((task) => task.done).length
}

export function overdueCount(tasks: Task[], today = todayISO(), filter: LaneFilter = "all") {
  return tasks.filter((task) => {
    if (task.done) return false
    if (filter === "done") return false
    if (filter !== "all" && task.category !== filter) return false
    return dayDiff(today, task.dueDate) < 0
  }).length
}

function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function icsStamp(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** All-day calendar event for a task due date. Opens as an .ics file on iPhone. */
export function buildTaskIcs(task: Task) {
  const stamp = icsStamp(new Date().toISOString())
  const due = task.dueDate.replace(/-/g, "")
  const endDate = (() => {
    const next = parseISODate(task.dueDate)
    next.setDate(next.getDate() + 1)
    return todayISO(next).replace(/-/g, "")
  })()
  const descriptionParts = [
    task.notes.trim() || null,
    `Lane: ${CATEGORIES[task.category].label}`,
  ].filter((part): part is string => Boolean(part))

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//3 Lists//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${task.id}@3lists`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${due}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${icsEscape(task.title)}`,
    `DESCRIPTION:${icsEscape(descriptionParts.join("\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}

export function downloadTaskIcs(task: Task) {
  if (typeof window === "undefined") return false
  try {
    const blob = new Blob([buildTaskIcs(task)], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const safeName = task.title.replace(/[^\w\s-]+/g, "").trim().slice(0, 40) || "task"
    link.href = url
    link.download = `${safeName}.ics`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}
