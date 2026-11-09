import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getLibrary } from '../lib/data'

function Group({ group, openKey, isOpen, onToggle }) {
  return (
    <div className={`out-group ${isOpen ? 'open' : ''}`}>
      <button className="out-head" onClick={() => onToggle(openKey)} aria-expanded={isOpen}>
        <span className="out-name">{group.name}</span>
        <span className="out-count">{group.count} 题</span>
        <ChevronDown size={15} className="out-arrow" />
      </button>
      {isOpen && (
        <div className="out-list">
          {group.items.map((q) => (
            <Link key={q.id} to={`/q/${q.id}`} className="out-item">
              <span className="out-no">{q.number}</span>
              <span className="out-title">{q.title || q.stem?.slice(0, 40) || '题目'}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Outline() {
  const [lib, setLib] = useState(null)
  const [open, setOpen] = useState(() => new Set())

  useEffect(() => {
    getLibrary().then(setLib).catch(() => {})
  }, [])

  const groups = useMemo(() => {
    if (!lib) return { prelim: [], training: [] }
    const prelim = new Map()
    const training = new Map()
    for (const q of lib.questions) {
      if (q.category === 'prelim') {
        if (!prelim.has(q.year)) {
          prelim.set(q.year, {
            key: `p-${q.year}`,
            name: q.paper || `${q.year} 初赛`,
            count: 0,
            items: [],
          })
        }
        const g = prelim.get(q.year)
        g.count++
        g.items.push(q)
      } else if (q.category === 'training') {
        if (!training.has(q.chapter)) {
          training.set(q.chapter, {
            key: `t-${q.chapter}`,
            name: `第 ${q.chapter} 章 · ${q.chapterName || ''}`,
            count: 0,
            items: [],
          })
        }
        const g = training.get(q.chapter)
        g.count++
        g.items.push(q)
      }
    }
    return {
      prelim: [...prelim.values()].sort((a, b) => Number(b.key.slice(2)) - Number(a.key.slice(2))),
      training: [...training.values()].sort((a, b) => Number(a.key.slice(2)) - Number(b.key.slice(2))),
    }
  }, [lib])

  function toggle(key) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
      <main className="main outline-wrap">
        <div className="crumb">
          <Link to="/">首页</Link>
          <span className="sep">/</span>
          <Link to="/s/math">数学</Link>
          <span className="sep">/</span>
          <span style={{ color: 'var(--ink-2)' }}>目录</span>
        </div>

        <div className="outline-hero">
          <div className="eyebrow">OUTLINE · 题目目录</div>
          <h1 className="serif">按卷或按章，直接选题</h1>
          <p className="muted">点分类展开题目列表，选中即进入该题开始练习。</p>
        </div>

        {!lib && <div className="empty"><div className="big">正在加载目录…</div></div>}

        {lib && (
          <div className="outline-grid">
            <section>
              <div className="outline-section-title">
                初赛卷
                <span className="tiny muted">{groups.prelim.length} 届 · {groups.prelim.reduce((n, g) => n + g.count, 0)} 题</span>
              </div>
              {groups.prelim.map((g) => (
                <Group key={g.key} group={g} openKey={g.key} isOpen={open.has(g.key)} onToggle={toggle} />
              ))}
            </section>

            <section>
              <div className="outline-section-title">
                能力拓展与训练
                <span className="tiny muted">{groups.training.length} 章 · {groups.training.reduce((n, g) => n + g.count, 0)} 题</span>
              </div>
              {groups.training.map((g) => (
                <Group key={g.key} group={g} openKey={g.key} isOpen={open.has(g.key)} onToggle={toggle} />
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
