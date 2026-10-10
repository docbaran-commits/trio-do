import { detectInstall, type InstallKind } from "@/components/install-hint"
import {
  INSTALL_DISMISS_KEY,
  STORAGE_KEY,
  loadTasks,
  saveTasks,
  todayISO,
  type Task,
} from "@/lib/tasks"

type TaskSnapshot = {
  tasks: Task[]
  persisted: boolean
}

type InstallSnapshot = {
  standalone: boolean
  kind: InstallKind
  dismissed: boolean
}

const SERVER_TASKS: TaskSnapshot = { tasks: [], persisted: true }
const SERVER_INSTALL: InstallSnapshot = {
  standalone: false,
  kind: "other",
  dismissed: true,
}

let tasksSnapshot: TaskSnapshot | null = null
let installSnapshot: InstallSnapshot | null = null
const taskListeners = new Set<() => void>()
const installListeners = new Set<() => void>()

function emit(listeners: Set<() => void>) {
  for (const listener of listeners) listener()
}

function readTasks() {
  if (!tasksSnapshot) {
    const loaded = loadTasks()
    tasksSnapshot = { tasks: loaded.tasks, persisted: loaded.persisted }
  }
  return tasksSnapshot
}

function readInstall() {
  if (!installSnapshot) {
    const detected = detectInstall()
    let dismissed = true
    try {
      dismissed = window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1"
    } catch {
      dismissed = false
    }
    installSnapshot = { ...detected, dismissed }
  }
  return installSnapshot
}

export function subscribeTasks(listener: () => void) {
  taskListeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    const loaded = loadTasks()
    tasksSnapshot = { tasks: loaded.tasks, persisted: loaded.persisted }
    emit(taskListeners)
  }
  window.addEventListener("storage", onStorage)
  return () => {
    taskListeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function getTaskSnapshot() {
  return readTasks()
}

export function getServerTaskSnapshot() {
  return SERVER_TASKS
}

export function replaceTasks(next: Task[]) {
  const persisted = saveTasks(next)
  tasksSnapshot = { tasks: next, persisted }
  emit(taskListeners)
  return persisted
}

export function subscribeInstall(listener: () => void) {
  installListeners.add(listener)
  return () => {
    installListeners.delete(listener)
  }
}

export function getInstallSnapshot() {
  return readInstall()
}

export function getServerInstallSnapshot() {
  return SERVER_INSTALL
}

export function setInstallDismissed(dismissed: boolean) {
  const current = readInstall()
  installSnapshot = { ...current, dismissed }
  try {
    if (dismissed) window.localStorage.setItem(INSTALL_DISMISS_KEY, "1")
    else window.localStorage.removeItem(INSTALL_DISMISS_KEY)
  } catch {
    // The hint still updates for this visit.
  }
  emit(installListeners)
}

export function subscribeToday(listener: () => void) {
  const notify = () => listener()
  window.addEventListener("focus", notify)
  document.addEventListener("visibilitychange", notify)
  return () => {
    window.removeEventListener("focus", notify)
    document.removeEventListener("visibilitychange", notify)
  }
}

export function getTodaySnapshot() {
  return todayISO()
}

export function getServerTodaySnapshot() {
  return ""
}

export function subscribeReady(listener: () => void) {
  void listener
  return () => {}
}

export function getReadySnapshot() {
  return true
}

export function getServerReadySnapshot() {
  return false
}
