import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, Moon, Sun } from 'lucide-react'
import { getLibrary } from '../lib/data'
import { setTheme, syncFavoritesFromCloud, useStore } from '../lib/store'
import UserSwitcher from './UserSwitcher'
import { useUser } from '../lib/auth'

export default function Layout() {
  const { theme } = useStore()
  const user = useUser()
  const [subjects, setSubjects] = useState([])
  const location = useLocation()

  useEffect(() => {
    getLibrary().then((l) => setSubjects(l.subjects.filter((s) => s.status === 'ready')))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (user?.id) syncFavoritesFromCloud(user.id)
  }, [user?.id])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname, location.search])

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">L</span>
            <span>
              <span style={{ display: 'block', lineHeight: 1.15 }}>Lumina</span>
              <span className="brand-sub">点点积累</span>
            </span>
          </Link>

          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              首页
            </NavLink>
            {subjects.map((s) => (
              <NavLink key={s.id} to={`/s/${s.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
                {s.name}
              </NavLink>
            ))}
            <NavLink to="/formulas" className={({ isActive }) => (isActive ? 'active' : '')}>
              公式
            </NavLink>
            <NavLink to="/picks" className={({ isActive }) => (isActive ? 'active' : '')}>
              好题
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
              说明
            </NavLink>
          </nav>

          <div className="top-actions">
            <UserSwitcher />
            <Link to="/s/math" className="icon-btn" title="开始刷题" aria-label="开始刷题">
              <BookOpen size={17} />
            </Link>
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
              aria-label="切换主题"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      <Outlet />

      <footer style={{ borderTop: '1px solid var(--line)', marginTop: 40 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '22px 20px 34px', display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', color: 'var(--muted)', fontSize: 12.5 }}>
          <span>Lumina · 点点积累，照亮备考长路</span>
          <span>Cloudflare Pages · 云端笔记按账号隔离</span>
        </div>
      </footer>
    </>
  )
}
