import { useEffect, useState } from 'react'

export const ACCOUNTS = [
  { id: 'u1', name: '杨玉秀', color: '#A67C10' },
  { id: 'u2', name: '李泽枫', color: '#174A77' },
]

let current = null
let loaded = false
const listeners = new Set()

function emit() {
  listeners.forEach((fn) => fn(current))
}

export async function loadMe() {
  try {
    const r = await fetch('/api/auth/me', { credentials: 'same-origin' })
    const d = await r.json()
    current = d.user || null
  } catch {
    current = null
  }
  loaded = true
  emit()
  return current
}

export async function switchUser(userId) {
  const r = await fetch('/api/auth/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ userId }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || '切换失败')
  current = d.user
  emit()
  return current
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch {
    /* ignore */
  }
  current = null
  emit()
}

export function useUser() {
  const [user, setUser] = useState(current)
  useEffect(() => {
    const fn = (u) => setUser(u)
    listeners.add(fn)
    if (loaded) setUser(current)
    else loadMe()
    return () => listeners.delete(fn)
  }, [])
  return user
}
