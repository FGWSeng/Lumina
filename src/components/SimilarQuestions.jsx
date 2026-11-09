import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Layers } from 'lucide-react'
import { getLibrary } from '../lib/data'

function overlap(a, b) {
  const sa = new Set(a.tags || [])
  const sb = new Set(b.tags || [])
  let n = 0
  for (const t of sa) if (sb.has(t)) n++
  return n
}

function label(q) {
  return q.category === 'training'
    ? `第 ${q.chapter} 章 · ${q.number} · 训练`
    : `${q.year} · ${q.number} · ${q.typeName}`
}

function Item({ q }) {
  return (
    <li>
      <Link to={`/q/${q.id}`}>
        <span className="similar-meta">{label(q)}</span>
        <span className="similar-stem" dangerouslySetInnerHTML={{ __html: q.stemHtml || q.stem }} />
      </Link>
    </li>
  )
}

export default function SimilarQuestions({ question, limit = 8 }) {
  const [lib, setLib] = useState(null)

  useEffect(() => {
    getLibrary().then(setLib).catch(() => {})
  }, [])

  const { main, cross, title, crossTitle } = useMemo(() => {
    if (!lib || !question) return { main: [], cross: [], title: '', crossTitle: '' }
    const isTraining = question.category === 'training'

    const mainPool = isTraining
      ? lib.questions.filter(
          (q) => q.id !== question.id && q.category === 'training' && q.chapter === question.chapter,
        )
      : lib.questions.filter((q) => q.id !== question.id && q.category === 'prelim' && q.type === question.type)

    const chapters = question.trainingChapters || (isTraining ? [question.chapter] : [])
    const crossPool = isTraining
      ? lib.questions.filter((q) => q.category === 'prelim' && (q.trainingChapters || []).includes(question.chapter))
      : lib.questions.filter((q) => q.category === 'training' && chapters.includes(q.chapter))

    const rank = (list, n) =>
      list
        .map((q) => ({ q, score: overlap(question, q) }))
        .sort(
          (a, b) =>
            b.score - a.score || (b.q.year || 0) - (a.q.year || 0) || a.q.id.localeCompare(b.q.id),
        )
        .slice(0, n)
        .map((x) => x.q)

    return {
      main: rank(mainPool, limit),
      cross: rank(crossPool, 4),
      title: isTraining ? '同章训练' : '真题同类',
      crossTitle: isTraining ? '相关真题' : '能力拓展（同章）',
    }
  }, [lib, question, limit])

  if (!main.length && !cross.length) return null

  return (
    <details className="similar-block">
      <summary>
        <Layers size={15} />
        <span>
          同类题 · {main.length + cross.length} 道
          {cross.length ? `（含${crossTitle} ${cross.length} 道）` : ''}
        </span>
        <ChevronDown size={15} className="similar-arrow" />
      </summary>

      {main.length > 0 && (
        <div className="similar-group">
          <div className="similar-group-title">
            {title} · {main.length}
          </div>
          <ul className="similar-list">
            {main.map((q) => (
              <Item key={q.id} q={q} />
            ))}
          </ul>
        </div>
      )}

      {cross.length > 0 && (
        <div className="similar-group">
          <div className="similar-group-title">
            {crossTitle} · {cross.length}
          </div>
          <ul className="similar-list">
            {cross.map((q) => (
              <Item key={q.id} q={q} />
            ))}
          </ul>
        </div>
      )}

      <div className="similar-hint">
        同分类同题型优先，共享考点越多越靠前；能力拓展题按对应章节关联，新题入库后自动生效
      </div>
    </details>
  )
}
