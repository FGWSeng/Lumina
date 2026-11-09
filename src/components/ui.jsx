import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Lightbulb } from 'lucide-react'

export function Difficulty({ value = 3 }) {
  return (
    <span className="diff" title={`难度 ${value} / 5`} aria-label={`难度 ${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= value ? 'on' : ''} />
      ))}
    </span>
  )
}

export function Tags({ items = [], max = 3, tone = '' }) {
  return (
    <>
      {items.slice(0, max).map((t) => (
        <span key={t} className={`chip ${tone}`}>
          {t}
        </span>
      ))}
    </>
  )
}

export function Hint({ tags = [] }) {
  const [open, setOpen] = useState(false)
  if (!tags.length) return null
  return (
    <div className={`hint ${open ? 'open' : ''}`}>
      <button className="hint-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Lightbulb size={14} />
        <span>提示</span>
        <ChevronDown size={14} className="hint-arrow" />
      </button>
      {open && (
        <div className="hint-body">
          <Tags items={tags} max={8} tone="gold" />
        </div>
      )}
    </div>
  )
}

export function QuestionListItem({ q }) {
  return (
    <Link to={`/q/${q.id}`} className="list-item">
      <div className="row wrap" style={{ marginBottom: 5 }}>
        <span className="q-no">{q.number}</span>
        <span className="q-src">
          {q.year} · {q.paper?.replace(/（\d{4}）/, '') || q.source}
        </span>
        <Difficulty value={q.difficulty} />
        <span className="q-src" style={{ marginLeft: 'auto' }}>
          {q.steps} 步
        </span>
      </div>
      <div className="list-title">
        <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>{q.title}</strong>
        {q.preview ? <span className="list-stem" dangerouslySetInnerHTML={{ __html: q.preview }} /> : null}
      </div>
      <div className="list-meta">
        <span className="chip brand">{q.typeName}</span>
        {q.hasMoral && <span className="chip gold">心法</span>}
      </div>
    </Link>
  )
}

export function Empty({ title = '没有匹配的题目', desc = '试试换个关键词，或清空筛选条件。' }) {
  return (
    <div className="empty">
      <div className="big">{title}</div>
      <div className="small">{desc}</div>
    </div>
  )
}
