import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { getLibrary } from '../lib/data'
import { useUser } from '../lib/auth'
import { dateLabel, shiftDate, todayStr } from '../lib/picks'

export default function Picks() {
  const user = useUser()
  const [date, setDate] = useState(todayStr())
  const [picks, setPicks] = useState([])
  const [dates, setDates] = useState([])
  const [lib, setLib] = useState(null)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getLibrary().then(setLib).catch(() => {})
  }, [])

  async function loadDates() {
    if (!user) return
    try {
      const r = await fetch('/api/picks/dates', { credentials: 'same-origin' })
      const d = await r.json().catch(() => ({}))
      setDates(d.dates || [])
    } catch {
      /* ignore */
    }
  }

  async function loadDay(d) {
    if (!user) {
      setPicks([])
      return
    }
    setLoading(true)
    try {
      const r = await fetch(`/api/picks?date=${d}`, { credentials: 'same-origin' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || '加载失败')
      setPicks(data.picks || [])
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDates()
  }, [user?.id])

  useEffect(() => {
    loadDay(date)
  }, [date, user?.id])

  async function remove(id) {
    try {
      await fetch(`/api/picks/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      await loadDay(date)
      await loadDates()
    } catch {
      setError('移除失败，请重试')
    }
  }

  const byId = useMemo(() => {
    const m = new Map()
    for (const q of lib?.questions || []) m.set(q.id, q)
    return m
  }, [lib])

  const dateChips = useMemo(() => {
    const map = new Map()
    map.set(todayStr(), 0)
    map.set(shiftDate(todayStr(), -1), 0)
    for (const d of dates) map.set(d.date, d.count)
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)
  }, [dates])

  if (!user) {
    return (
      <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div className="empty">
          <div className="big">请先选择账号</div>
          <div className="small">今日好题按账号保存，右上角选择「杨玉秀」或「李泽枫」后查看。</div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell picks-shell">
      <main className="main picks-main">
        <div className="picks-hero">
          <div className="eyebrow">DAILY PICKS · 今日好题</div>
          <h1 className="serif">每天挑几道值得回看的题</h1>
          <p className="muted">在题目页点「好题」记录，之后按日期回溯；复习到位后移除即可。</p>
        </div>

        <div className="picks-dates">
          {dateChips.map(([d, n]) => (
            <button key={d} className={`pick-date ${d === date ? 'active' : ''}`} onClick={() => setDate(d)}>
              <span>{dateLabel(d)}</span>
              {n > 0 && <em>{n}</em>}
            </button>
          ))}
        </div>

        <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="small muted">
            {dateLabel(date)} · <strong style={{ color: 'var(--ink)' }}>{picks.length}</strong> 道
          </span>
          <Link to="/s/math" className="btn sm">
            去刷题
          </Link>
        </div>

        {error && <div className="notes-error">{error}</div>}
        {loading && <div className="small muted">加载中…</div>}

        {!loading && picks.length === 0 && (
          <div className="empty">
            <div className="big">这一天还没有记录</div>
            <div className="small">刷题时点一下「好题」，就会出现在这里。</div>
          </div>
        )}

        <div className="picks-list">
          {picks.map((p) => {
            const q = byId.get(p.questionId)
            return (
              <div key={p.id} className="pick-item">
                <Link to={`/q/${p.questionId}`} className="pick-link">
                  <span className="pick-meta">
                    {q
                      ? q.category === 'training'
                        ? `第 ${q.chapter} 章 · ${q.number}`
                        : `${q.year} · ${q.number} · ${q.typeName}`
                      : p.questionId}
                  </span>
                  <span className="pick-title" dangerouslySetInnerHTML={{ __html: q?.titleHtml || q?.title || '题目' }} />
                  {q?.stemHtml && <span className="pick-stem" dangerouslySetInnerHTML={{ __html: q.stemHtml }} />}
                </Link>
                <button className="pick-remove" onClick={() => setConfirmId(p.id)} title="已复习，移除">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>

        {confirmId && (
          <div className="confirm-mask" onClick={() => setConfirmId('')}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-title">移出今日好题？</div>
              <div className="confirm-text">表示这道题已经复习到位，记录会从这一天移除，题目本身不受影响。</div>
              <div className="confirm-actions">
                <button className="btn sm" onClick={() => setConfirmId('')}>
                  取消
                </button>
                <button
                  className="btn sm danger"
                  onClick={async () => {
                    const id = confirmId
                    setConfirmId('')
                    await remove(id)
                  }}
                >
                  移出
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
