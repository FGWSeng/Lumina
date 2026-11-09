import { useSyncExternalStore } from 'react'

const KEY = 'qb.state.v1'
const defaults = { favorites: [], mastery: {}, theme: 'light', font: 1 }

function load() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...defaults }
  }
}

let state = load()
const listeners = new Set()

function commit(next) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 忽略隐私模式写入失败 */
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useStore() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

export function isFavorite(id) {
  return state.favorites.includes(id)
}

export function getFavorites() {
  return state.favorites
}

export function setFavorites(list) {
  commit({ ...state, favorites: list })
}

async function pushFavorite(id, add) {
  try {
    if (add) {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ questionId: id }),
      })
    } else {
      await fetch(`/api/favorites/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' })
    }
  } catch {
    /* 云端失败时保留本地状态，下次同步会纠正 */
  }
}

export function toggleFavorite(id) {
  const has = state.favorites.includes(id)
  const next = has ? state.favorites.filter((x) => x !== id) : [id, ...state.favorites]
  commit({ ...state, favorites: next })
  pushFavorite(id, !has)
}

const SYNC_KEY = 'qb.favSyncedUser'

export async function syncFavoritesFromCloud(userId) {
  if (!userId) return
  try {
    const r = await fetch('/api/favorites', { credentials: 'same-origin' })
    if (!r.ok) return
    const d = await r.json()
    const cloud = (d.favorites || []).map((x) => x.questionId)
    const prev = localStorage.getItem(SYNC_KEY)
    const local = state.favorites

    if (!prev && cloud.length === 0 && local.length) {
      for (const id of local) await pushFavorite(id, true)
      localStorage.setItem(SYNC_KEY, userId)
      return
    }
    commit({ ...state, favorites: cloud })
    localStorage.setItem(SYNC_KEY, userId)
  } catch {
    /* 忽略网络错误 */
  }
}

export function getMastery(id) {
  return state.mastery[id] || ''
}

export function setMastery(id, value) {
  const next = { ...state.mastery }
  if (!value || next[id] === value) delete next[id]
  else next[id] = value
  commit({ ...state, mastery: next })
}

export function setTheme(theme) {
  commit({ ...state, theme })
}

export function setFont(font) {
  commit({ ...state, font })
}

export const MASTERY = [
  { id: 'hard', name: '不熟练' },
  { id: 'no', name: '不会' },
  { id: 'mastered', name: '掌握' },
]
