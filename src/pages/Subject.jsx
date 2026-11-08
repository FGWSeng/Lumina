import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, Filter, Search, X } from 'lucide-react'
import { filterQuestions, findSubject, getLibrary } from '../lib/data'
import { Empty, QuestionListItem } from '../components/ui'
import SingleQuestion from '../components/SingleQuestion'

const PER_PAGE = 20

export default function Subject() {
  const { subjectId } = useParams()
  const [lib, setLib] = useState(null)
  const [params, setParams] = useSearchParams()
  const [kw, setKw] = useState(params.get('q') || '')
  const [openFilter, setOpenFilter] = useState(false)

  useEffect(() => {
    getLibrary().then(setLib)
  }, [])

  const subject = findSubject(lib, subjectId)
  const group = subject?.groups?.[0]
  const categories = group?.categories || []
  const catId = params.get('cat') || categories[0]?.id || ''
  const category = categories.find((c) => c.id === catId)
  const type = params.get('type') || ''
  const year = params.get('year') || ''
  const tag = params.get('tag') || ''
  const q = params.get('q') || ''
  const page = Math.max(1, Number(params.get('page') || 1))
  const view = params.get('view') === 'list' ? 'list' : 'single'
  const currentId = params.get('id') || ''

  useEffect(() => {
    const t = setTimeout(() => {
      if (kw === (params.get('q') || '')) return
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (kw.trim()) p.set('q', kw.trim())
          else p.delete('q')
          p.delete('page')
          return p
        },
        { replace: true },
      )
    }, 300)
    return () => clearTimeout(t)
  }, [kw])

  const list = useMemo(() => {
    if (!lib) return []
    return filterQuestions(lib.questions, { subject: subjectId, group: group?.id, category: catId, type, year, tag, q })
  }, [lib, subjectId, group?.id, catId, type, year, tag, q])

  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const current = Math.min(page, totalPages)
  const items = list.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  function patch(key, value) {
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (value) p.set(key, value)
      else p.delete(key)
      if (key !== 'page') p.delete('page')
      return p
    })
  }

  function selectId(id, replace) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (id) p.set('id', id)
        else p.delete('id')
        return p
      },
      { replace: !!replace },
    )
  }

  function clearAll() {
    setKw('')
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      ;['type', 'year', 'tag', 'q', 'page'].forEach((k) => p.delete(k))
      return p
    })
  }

  const hasFilter = type || year || tag || q

  if (!subject) {
    return (
      <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div className="empty">
          <div className="big">{lib ? '没有这个科目' : '正在加载…'}</div>
        </div>
      </div>
    )
  }

  if (subject.status !== 'ready') {
    return (
      <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div className="main" style={{ maxWidth: 720, margin: '40px auto' }}>
          <div className="card" style={{ padding: 28 }}>
            <div className="eyebrow">Coming soon</div>
            <h1 className="serif" style={{ fontSize: 26, margin: '8px 0 10px' }}>
              {subject.name} · 筹备中
            </h1>
            <p className="muted" style={{ marginTop: 0 }}>
              {subject.desc} 目前先把结构留好，内容会按题目类型逐步接入。
            </p>
            <Link to="/" className="btn" style={{ marginTop: 8 }}>
              返回首页
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${openFilter ? 'open' : ''}`}>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">目录</div>
            <span className="tiny muted">{subject.count} 题</span>
          </div>
          <div className="panel-body">
            <div className="tree">
              <div className="tree-group-label">{group?.name}</div>
              {categories.map((c) => (
                <div key={c.id}>
                  <button className={`tree-item ${c.id === catId ? 'active' : ''}`} onClick={() => patch('cat', c.id)}>
                    {c.name}
                    <span className="count">{c.count}</span>
                  </button>
                  {c.years?.length > 0 && (
                    <div className="tree-sub">
                      {c.years.map((y) => (
                        <button
                          key={y.year}
                          className={`tree-item ${String(y.year) === year ? 'active' : ''}`}
                          onClick={() => patch('year', String(y.year) === year ? '' : String(y.year))}
                        >
                          {y.year}
                          <span className="count">{y.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {category?.tags?.length > 0 && (
          <div className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <div className="panel-title">高频考点</div>
            </div>
            <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {category.tags.slice(0, 14).map((t) => (
                <button
                  key={t.name}
                  className={`chip ${tag === t.name ? 'gold' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => patch('tag', tag === t.name ? '' : t.name)}
                >
                  {t.name}
                  <span style={{ opacity: 0.6 }}>{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="main">
        <div className="crumb">
          <Link to="/">首页</Link>
          <span className="sep">/</span>
          <span>{subject.name}</span>
          <span className="sep">/</span>
          <span style={{ color: 'var(--ink-2)' }}>{group?.name}</span>
          <span className="sep">/</span>
          <span style={{ color: 'var(--ink-2)' }}>{category?.name}</span>
        </div>

        <div className="row page-head" style={{ justifyContent: 'space-between', marginBottom: 14, alignItems: 'flex-end' }}>
          <div>
            <h1 className="serif" style={{ fontSize: 24, margin: 0 }}>
              {subject.name} · {category?.name}
            </h1>
            <div className="small muted page-desc" style={{ marginTop: 4 }}>
              {category?.desc}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="seg">
              <button className={view === 'single' ? 'active' : ''} onClick={() => patch('view', 'single')}>
                单题
              </button>
              <button className={view === 'list' ? 'active' : ''} onClick={() => patch('view', 'list')}>
                列表
              </button>
            </div>
            <button className="btn sm mobile-filter-btn" onClick={() => setOpenFilter((v) => !v)}>
              <Filter size={14} /> 目录
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <Search size={16} style={{ color: 'var(--muted)', flex: 'none' }} />
            <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索题干、考点、年份…" inputMode="search" />
            {kw && (
              <button className="btn ghost sm" style={{ width: 24, height: 24, padding: 0 }} onClick={() => setKw('')} aria-label="清除">
                <X size={14} />
              </button>
            )}
          </div>

          <select className="select" value={type} onChange={(e) => patch('type', e.target.value)} aria-label="题型">
            <option value="">全部题型</option>
            {(category?.types || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}（{t.count}）
              </option>
            ))}
          </select>

          <select className="select" value={year} onChange={(e) => patch('year', e.target.value)} aria-label="年份">
            <option value="">全部年份</option>
            {(category?.years || []).map((y) => (
              <option key={y.year} value={y.year}>
                {y.year}（{y.count}）
              </option>
            ))}
          </select>

          {hasFilter && (
            <button className="btn sm" onClick={clearAll}>
              清空筛选
            </button>
          )}
        </div>

        {view === 'single' ? (
          <SingleQuestion list={list} currentId={currentId} onSelect={selectId} />
        ) : (
          <>
            <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="small muted">
                共 <strong style={{ color: 'var(--ink)' }}>{list.length}</strong> 题
                {tag && ` · 标签「${tag}」`}
                {q && ` · 搜索「${q}」`}
              </span>
              <span className="tiny muted">
                第 {current} / {totalPages} 页
              </span>
            </div>

            <div className="card">
              {items.length === 0 ? <Empty /> : items.map((item) => <QuestionListItem key={item.id} q={item} />)}
            </div>

            {totalPages > 1 && (
              <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 18 }}>
                <button className="btn sm" disabled={current <= 1} onClick={() => patch('page', String(current - 1))}>
                  上一页
                </button>
                {pageNumbers(current, totalPages).map((n, i) =>
                  n === '…' ? (
                    <span key={`e${i}`} className="muted small">
                      …
                    </span>
                  ) : (
                    <button key={n} className={`btn sm ${n === current ? 'primary' : ''}`} onClick={() => patch('page', String(n))}>
                      {n}
                    </button>
                  ),
                )}
                <button className="btn sm" disabled={current >= totalPages} onClick={() => patch('page', String(current + 1))}>
                  下一页 <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current - 1, current, current + 1])
  const arr = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out = []
  arr.forEach((n, i) => {
    if (i > 0 && n - arr[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}
