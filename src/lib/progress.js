const KEY = 'lumina:progress:math'
const TTL = 7 * 24 * 60 * 60 * 1000

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || !p.id) return null
    if (Date.now() - (p.ts || 0) > TTL) return null
    return p
  } catch {
    return null
  }
}

export function saveProgress(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, ts: Date.now() }))
  } catch {
    /* 隐私模式忽略 */
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
