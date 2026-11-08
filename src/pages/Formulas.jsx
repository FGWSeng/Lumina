import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ListTree, Search, X } from 'lucide-react'

export default function Formulas() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(() => new Set())
  const [mode, setMode] = useState('multi')
  const [q, setQ] = useState('')
  const [active, setActive] = useState('')
  const navRef = useRef(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/formulas.json`)
      .then((r) => {
        if (!r.ok) throw new Error('公式数据加载失败')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  const chapters = useMemo(() => {
    if (!data) return []
    const kw = q.trim().toLowerCase()
    if (!kw) return data.chapters
    return data.chapters
      .map((ch) => ({
        ...ch,
        groups: ch.groups
          .map((g) => ({
            ...g,
            formulas: g.formulas.filter((f) =>
              `${f.name} ${f.tags.join(' ')} ${f.memory} ${f.derive.join(' ')}`.toLowerCase().includes(kw),
            ),
          }))
          .filter((g) => g.formulas.length),
      }))
      .filter((ch) => ch.groups.length)
  }, [data, q])

  const visibleIds = useMemo(
    () => chapters.flatMap((ch) => ch.groups.flatMap((g) => g.formulas.map((f) => f.id))),
    [chapters],
  )

  function toggle(id) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (mode === 'accordion') next.clear()
        next.add(id)
      }
      return next
    })
  }

  function expandAll() {
    setOpen(new Set(visibleIds))
  }

  function collapseAll() {
    setOpen(new Set())
  }

  function switchMode(next) {
    setMode(next)
    if (next === 'accordion') {
      setOpen((prev) => {
        const first = [...prev][0]
        return first ? new Set([first]) : new Set()
      })
    }
  }

  function jump(id) {
    setActive(id)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function jumpToFormula(id) {
    setOpen((prev) => new Set(prev).add(id))
    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1400)
    })
  }

  if (error) {
    return (
      <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div className="empty">
          <div className="big">{error}</div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div className="empty">
          <div className="big">正在加载公式…</div>
          <div className="small">首次加载约 2 MB，之后会走缓存</div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell formula-shell">
      <aside className="sidebar formula-sidebar">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">章节目录</div>
            <span className="tiny muted">{data.count} 条</span>
          </div>
          <div className="panel-body" ref={navRef}>
            <div className="tree">
              {data.chapters.map((ch) => (
                <button key={ch.id} className={`tree-item ${active === ch.id ? 'active' : ''}`} onClick={() => jump(ch.id)}>
                  <span className="tiny muted" style={{ flex: 'none' }}>
                    {ch.no.replace('第', '').replace('章', '')}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="main formula-main">
        <div className="formula-hero">
          <div className="eyebrow">FORMULA · 公式背诵</div>
          <h1 className="serif">竞赛公式大全</h1>
          <p className="muted">{data.subtitle}</p>
          <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
            <span className="chip brand">{data.chapters.length} 章</span>
            <span className="chip">{data.count} 条公式</span>
            <span className="chip gold">点击卡片展开推导</span>
          </div>
        </div>

        <div className="toolbar formula-toolbar">
          <div className="search">
            <Search size={16} style={{ color: 'var(--muted)', flex: 'none' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索公式名称、考点或关键词…" />
            {q && (
              <button className="btn ghost sm" style={{ width: 24, height: 24, padding: 0 }} onClick={() => setQ('')} aria-label="清除">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="seg">
            <button className={mode === 'multi' ? 'active' : ''} onClick={() => switchMode('multi')}>
              多条展开
            </button>
            <button className={mode === 'accordion' ? 'active' : ''} onClick={() => switchMode('accordion')}>
              手风琴
            </button>
          </div>

          <button className="btn sm" onClick={expandAll}>
            全部展开
          </button>
          <button className="btn sm" onClick={collapseAll}>
            全部收起
          </button>
        </div>

        <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="small muted">
            共 <strong style={{ color: 'var(--ink)' }}>{visibleIds.length}</strong> 条
            {q && ` · 搜索「${q}」`}
          </span>
          <span className="tiny muted">已展开 {open.size} 条</span>
        </div>

        {chapters.length === 0 && (
          <div className="empty">
            <div className="big">没有匹配的公式</div>
            <div className="small">换个关键词试试，比如「泰勒」「柯西」「Green」。</div>
          </div>
        )}

        {chapters.map((ch) => (
          <section key={ch.id} id={ch.id} className="formula-chapter">
            <div className="chapter-head">
              <span className="sno">{ch.no}</span>
              <h2 className="stitle">{ch.title}</h2>
              <span className="chip">{ch.groups.reduce((n, g) => n + g.formulas.length, 0)} 条</span>
            </div>

            <details className="chapter-index">
              <summary>本章索引 · {ch.groups.reduce((n, g) => n + g.formulas.length, 0)} 条</summary>
              <div className="chapter-index-grid">
                {ch.groups.flatMap((g) => g.formulas).map((f) => (
                  <button key={f.id} onClick={() => jumpToFormula(f.id)}>
                    {f.name}
                  </button>
                ))}
              </div>
            </details>
            {ch.freq && <div className="freq" dangerouslySetInnerHTML={{ __html: ch.freq }} />}
            {ch.lead && <p className="lead" dangerouslySetInnerHTML={{ __html: ch.lead }} />}

            {ch.groups.map((g) => (
              <div key={g.id} className="formula-group">
                <h3 className="formula-group-title">
                  <ListTree size={14} /> {g.title}
                </h3>
                <div className="formula-list">
                  {g.formulas.map((f) => {
                    const isOpen = open.has(f.id)
                    return (
                      <article key={f.id} id={f.id} className={`formula-card ${isOpen ? 'open' : ''}`}>
                        <button className="formula-head" onClick={() => toggle(f.id)} aria-expanded={isOpen}>
                          <span className="formula-name">{f.name}</span>
                          <span className="formula-tags">
                            {f.tags.slice(0, 3).map((t) => (
                              <span key={t} className="chip">
                                {t}
                              </span>
                            ))}
                          </span>
                          <ChevronDown size={16} className={`formula-arrow ${isOpen ? 'rot' : ''}`} />
                        </button>

                        <div className="formula-expr" dangerouslySetInnerHTML={{ __html: f.expr }} />

                        {isOpen && (
                          <div className="formula-body reveal">
                            <div className="formula-derive">
                              <div className="formula-label">推导思路</div>
                              <ol>
                                {f.derive.map((s, i) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ol>
                            </div>
                            <div className="formula-memory">
                              <div className="formula-label">记忆技巧</div>
                              <p>{f.memory}</p>
                            </div>
                            {f.when && (
                              <div className="formula-when">
                                <div className="formula-label">何时用</div>
                                <p>{f.when}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  )
}
