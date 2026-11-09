function pad(n) {
  return String(n).padStart(2, '0')
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

export function dateLabel(dateStr) {
  const today = todayStr()
  if (dateStr === today) return '今天'
  if (dateStr === shiftDate(today, -1)) return '昨天'
  const [, m, d] = dateStr.split('-')
  return `${Number(m)} 月 ${Number(d)} 日`
}

let todaySet = new Set()
let todayPromise = null

export function resetToday() {
  todaySet = new Set()
  todayPromise = null
}

export async function ensureToday() {
  if (!todayPromise) {
    todayPromise = fetch(`/api/picks?date=${todayStr()}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { picks: [] }))
      .then((d) => {
        todaySet = new Set((d.picks || []).map((p) => p.questionId))
        return todaySet
      })
      .catch(() => todaySet)
  }
  return todayPromise
}

export async function isPicked(id) {
  await ensureToday()
  return todaySet.has(id)
}

export async function togglePick(id) {
  await ensureToday()
  if (todaySet.has(id)) {
    const r = await fetch(`/api/picks?date=${todayStr()}`, { credentials: 'same-origin' })
    const d = await r.json().catch(() => ({ picks: [] }))
    const item = (d.picks || []).find((p) => p.questionId === id)
    if (item) {
      await fetch(`/api/picks/${item.id}`, { method: 'DELETE', credentials: 'same-origin' })
    }
    todaySet.delete(id)
    return false
  }
  const r = await fetch('/api/picks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ questionId: id, date: todayStr() }),
  })
  if (!r.ok) throw new Error('记录失败，请稍后重试')
  todaySet.add(id)
  return true
}
