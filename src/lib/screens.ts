import type { AgrixScreen, PlanifyScreen, PlanTask } from '../data/projects'

// The rules the two apps really run, so the fragments' numbers add up.

// Agrix (backend/src/services/recommendationEngine.js): each rule a reading
// breaks takes 20 (high) or 10 (medium) off 100; under 90 is a warning,
// under 60 critical.
export function agrixHealth({ reading: r, thresholds: t }: AgrixScreen) {
  const broken = [
    r.moisture < t.moisture && { rule: 'moisture' as const, cost: 20 },
    r.ph < t.ph && { rule: 'ph' as const, cost: 10 },
    r.temperature > t.temperature && { rule: 'temperature' as const, cost: 20 },
  ].filter((b): b is { rule: 'moisture' | 'ph' | 'temperature'; cost: number } => Boolean(b))
  const score = Math.max(0, 100 - broken.reduce((sum, b) => sum + b.cost, 0))
  return { score, status: score < 60 ? 'critical' : score < 90 ? 'warning' : 'healthy', broken: broken.map((b) => b.rule) } as const
}

// Planify's local fallback (backend/src/services/scheduler.js): highest
// priority first, then the earliest deadline; sessions of the preferred
// length inside the focus window, 15 minutes apart, weekdays only.
export type Block = { task: PlanTask; day: number; start: number; end: number }

const RANK = { high: 0, medium: 1, low: 2 } as const
const BREAK = 15
const SHORTEST = 30
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export function planWeek({ window, sessionMinutes, tasks }: PlanifyScreen) {
  const [open, close] = window.map(minutes)
  const queue = [...tasks].sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.due - b.due)
  const blocks: Block[] = []
  let day = 0
  let at = open
  for (const task of queue) {
    let left = Math.round(task.hours * 60)
    while (left > 0 && day < 5) {
      if (close - at < SHORTEST) { day += 1; at = open; continue }
      const length = Math.min(left, sessionMinutes, close - at)
      blocks.push({ task, day, start: at, end: at + length })
      left -= length
      at += length + BREAK
    }
  }
  const focus = blocks.reduce((sum, b) => sum + b.end - b.start, 0)
  const high = blocks.filter((b) => b.task.priority === 'high').reduce((sum, b) => sum + b.end - b.start, 0)
  const late = blocks.filter((b) => b.day > b.task.due)
  const nextDue = Math.min(...tasks.map((t) => t.due))
  return { blocks, focus, high, late, nextDue }
}
