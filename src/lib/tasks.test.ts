import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  dayDiff,
  dueInfo,
  isRealDate,
  mergeTasks,
  normalizeTask,
  parseBackup,
  todayISO,
  type Task,
} from "./tasks.ts"

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "a",
    title: "Call the school",
    notes: "",
    category: "now",
    dueDate: "2026-10-10",
    done: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("dates", () => {
  it("formats today in the local calendar", () => {
    assert.equal(todayISO(new Date(2026, 9, 10, 23, 30)), "2026-10-10")
  })

  it("rejects impossible dates", () => {
    assert.equal(isRealDate("2026-02-31"), false)
    assert.equal(isRealDate("2026-10-10"), true)
  })

  it("describes due dates against a fixed today", () => {
    const today = "2026-10-10"
    assert.equal(dueInfo("2026-10-10", today).label, "Due today")
    assert.equal(dueInfo("2026-10-11", today).label, "Due tomorrow")
    assert.equal(dueInfo("2026-10-09", today).label, "Due yesterday")
    assert.equal(dueInfo("2026-10-07", today).label, "3 days overdue")
    assert.equal(dueInfo("2026-10-15", today).label, "Due in 5 days")
    assert.equal(dueInfo("2026-10-07", today).overdue, true)
    assert.equal(dueInfo("2026-10-10", today).overdue, false)
    assert.equal(dayDiff("2026-03-07", "2026-03-08"), 1)
  })
})

describe("backups", () => {
  it("drops broken tasks and keeps valid ones", () => {
    const raw = JSON.stringify({
      version: 1,
      tasks: [task(), { id: "bad" }, task({ id: "b", title: "  Book flights  ", category: "later" })],
    })
    const parsed = parseBackup(raw)
    assert.equal(parsed?.length, 2)
    assert.equal(parsed?.[1].title, "Book flights")
  })

  it("lets an imported copy replace the same id", () => {
    const current = [task({ title: "Old" })]
    const incoming = [task({ title: "Restored" }), task({ id: "c", title: "New", category: "late" })]
    const merged = mergeTasks(current, incoming)
    assert.deepEqual(
      merged.map((item) => item.title),
      ["Restored", "New"]
    )
  })

  it("rejects a blank title", () => {
    assert.equal(normalizeTask(task({ title: "   " })), null)
  })
})
