import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildTaskIcs,
  dayDiff,
  doneCount,
  dueInfo,
  isRealDate,
  mergeTasks,
  normalizeTask,
  openCount,
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

describe("counts", () => {
  it("separates open and done piles", () => {
    const list = [
      task({ id: "1", done: false, category: "now" }),
      task({ id: "2", done: true, category: "late" }),
      task({ id: "3", done: false, category: "late" }),
    ]
    assert.equal(openCount(list), 2)
    assert.equal(openCount(list, "late"), 1)
    assert.equal(openCount(list, "done"), 0)
    assert.equal(doneCount(list), 1)
  })
})

describe("calendar", () => {
  it("builds an all-day ICS event for the due date", () => {
    const ics = buildTaskIcs(
      task({
        id: "appt-1",
        title: "Dentist, check-up",
        notes: "Bring insurance card",
        dueDate: "2026-10-24",
        category: "now",
      })
    )
    assert.match(ics, /BEGIN:VCALENDAR/)
    assert.match(ics, /DTSTART;VALUE=DATE:20261024/)
    assert.match(ics, /DTEND;VALUE=DATE:20261025/)
    assert.match(ics, /SUMMARY:Dentist\\, check-up/)
    assert.match(ics, /DESCRIPTION:Bring insurance card\\nLane: Now/)
    assert.match(ics, /UID:appt-1@3lists/)
  })
})
