import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Search, X } from 'lucide-react'

export default function Formulas() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(() => new Set())
  const [mode, setMode] = useState('multi')
  const [q, setQ] = useState('')
  const [params, setParams] = useSearchParams()
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

  const allChapters = data?.chapters || []
  const activeId = params.get('ch') || allChapters[0]?.id || ''
  const activeChapter = allChapters.find((c) => c.id === activeId) || allChapters[0]

  const filtered = useMemo(() => {
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
              `${f.name} ${f.tags.join(' ')} ${f.memory} ${f.derive.join(' ')} ${f.when}`.toLowerCase().includes(kw),
            ),
          }))
          .filter((g) => g.formulas.length),
      }))
      .filter((ch) => ch.groups.length)
  }, [data, q])

  const searching = q.trim().length > 0
  const displayChapters = searching ? filtered : activeChapter ? [activeChapter] : []

  const visibleIds = useMemo(
    () => displayChapters.flatMap((ch) => ch.groups.flatMap((g) => g.formulas.map((f) => f.id))),
    [displayChapters],
  )
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds])
  const openVisible = [...open].filter((id) => visibleIdSet.has(id)).length

  function selectChapter(id) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('ch', id)
        return p
      },
      { replace: true },
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
    setOpen((prev) => new Set([...prev, ...visibleIds]))
  }

  function collapseAll() {
    setOpen(new Set())
  }

  function switchMode(next) {
    setMode(next)
    if (next === 'accordion') {
      setOpen((prev) => {
        const first = [...prev].find((id) => visibleIdSet.has(id))
        return first ? new Set([first]) : new Set()
      })
    }
  }

  function jump(id) {
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
          <div className="small">首次加载约 5 MB，之后会走缓存</div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell formula-shell">
      <aside className="sidebar formula-sidebar">
        <div className="panel formula-nav-panel">
          <div className="panel-head">
            <div className="panel-title">章节目录</div>
            <span className="tiny muted">{allChapters.length} 章</span>
          </div>
          <div className="panel-body" ref={navRef}>
            <div className="tree formula-nav-tree">
              {allChapters.map((ch) => (
                <div key={ch.id} className="nav-chapter">
                  <button
                    className={`tree-item ${!searching && activeChapter?.id === ch.id ? 'active' : ''}`}
                    onClick={() => selectChapter(ch.id)}
                  >
                    <span className="nav-ch-no">{ch.no.replace('第', '').replace('章', '')}</span>
                    <span className="nav-ch-title">{ch.title}</span>
                  </button>
                  {!searching && activeChapter?.id === ch.id && (
                    <div className="nav-groups">
                      {ch.groups.map((g) => (
                        <button key={g.id} className="nav-group" onClick={() => jump(g.id)}>
                          <span className="nav-g-title">{g.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

        <div className="mobile-chapter-bar">
          <select className="select" value={activeChapter?.id || ''} onChange={(e) => selectChapter(e.target.value)}>
            {allChapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.no}　{ch.title}
              </option>
            ))}
          </select>
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
            {searching ? (
              <>
                搜索到 <strong style={{ color: 'var(--ink)' }}>{visibleIds.length}</strong> 条，分布在 {filtered.length} 章
              </>
            ) : (
              <>
                {activeChapter?.no} · <strong style={{ color: 'var(--ink)' }}>{visibleIds.length}</strong> 条
              </>
            )}
          </span>
          <span className="tiny muted">已展开 {openVisible} 条</span>
        </div>

        {searching && filtered.length === 0 && (
          <div className="empty">
            <div className="big">没有匹配的公式</div>
            <div className="small">换个关键词试试，比如「泰勒」「柯西」「Green」。</div>
          </div>
        )}

        {displayChapters.map((ch) => (
          <section key={ch.id} id={ch.id} className="formula-chapter">
            <div className="chapter-head">
              <span className="sno">{ch.no}</span>
              <h2 className="stitle">{ch.title}</h2>
              <span className="chip">{ch.groups.reduce((n, g) => n + g.formulas.length, 0)} 条</span>
            </div>

            <details className="chapter-index">
              <summary>本章索引 · {ch.groups.reduce((n, g) => n + g.formulas.length, 0)} 条</summary>
              {ch.groups.map((g) => (
                <div key={g.id} className="index-group">
                  <div className="index-group-title">{g.title}</div>
                  <div className="chapter-index-grid">
                    {g.formulas.map((f) => (
                      <button key={f.id} onClick={() => jumpToFormula(f.id)}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </details>

            {ch.freq && <div className="freq" dangerouslySetInnerHTML={{ __html: ch.freq }} />}
            {ch.lead && <p className="lead" dangerouslySetInnerHTML={{ __html: ch.lead }} />}

            {ch.groups.map((g) => (
              <div key={g.id} id={g.id} className="formula-group">
                <h3 className="formula-group-title">{g.title}</h3>
                <div className="formula-list">
                  {g.formulas.map((f) => {
                    const isOpen = open.has(f.id)
                    return (
                      <article key={f.id} id={f.id} className={`formula-card ${isOpen ? 'open' : ''}`}>
                        <button className="formula-head" onClick={() => toggle(f.id)} aria-expanded={isOpen}>
                          <span className="formula-name">{f.name}</span>
                          <span className="formula-tags">
                            {(f.tagsHtml || f.tags).slice(0, 3).map((t, i) => (
                              <span key={i} className="chip" dangerouslySetInnerHTML={{ __html: t }} />
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
                                  <li key={i} dangerouslySetInnerHTML={{ __html: s }} />
                                ))}
                              </ol>
                            </div>
                            <div className="formula-memory">
                              <div className="formula-label">记忆技巧</div>
                              <p dangerouslySetInnerHTML={{ __html: f.memory }} />
                            </div>
                            {f.when && (
                              <div className="formula-when">
                                <div className="formula-label">何时用</div>
                                <p dangerouslySetInnerHTML={{ __html: f.when }} />
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

            {searching && (
              <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                <button className="btn sm" onClick={() => selectChapter(ch.id)}>
                  只查看这一章
                </button>
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  )
}
