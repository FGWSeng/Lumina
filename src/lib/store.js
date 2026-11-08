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

export function toggleFavorite(id) {
  const has = state.favorites.includes(id)
  commit({ ...state, favorites: has ? state.favorites.filter((x) => x !== id) : [id, ...state.favorites] })
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
