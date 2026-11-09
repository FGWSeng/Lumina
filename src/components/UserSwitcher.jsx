import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, LogOut } from 'lucide-react'
import { ACCOUNTS, logout, switchUser, useUser } from '../lib/auth'

export default function UserSwitcher() {
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  async function pick(id) {
    if (user?.id === id) {
      setOpen(false)
      return
    }
    setBusy(true)
    try {
      await switchUser(id)
      setOpen(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="user-switch" ref={ref}>
      <button className="user-btn" onClick={() => setOpen((v) => !v)}>
        <span className="user-dot" style={{ background: user?.color || 'var(--line-2)' }} />
        <span className="user-name">{user ? user.name : '选择账号'}</span>
        <ChevronDown size={13} />
      </button>

      {open && (
        <div className="user-menu">
          <div className="user-menu-title">切换账号</div>
          {ACCOUNTS.map((a) => (
            <button key={a.id} className="user-item" onClick={() => pick(a.id)} disabled={busy}>
              <span className="user-dot" style={{ background: a.color }} />
              <span style={{ flex: 1, textAlign: 'left' }}>{a.name}</span>
              {user?.id === a.id && <Check size={14} />}
            </button>
          ))}
          {user && (
            <button
              className="user-item muted"
              onClick={() => {
                logout()
                setOpen(false)
              }}
            >
              <LogOut size={14} />
              <span style={{ flex: 1, textAlign: 'left' }}>退出</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
