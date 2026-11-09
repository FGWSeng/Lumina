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

export default function SimilarQuestions({ question, limit = 8 }) {
  const [lib, setLib] = useState(null)

  useEffect(() => {
    getLibrary().then(setLib).catch(() => {})
  }, [])

  const items = useMemo(() => {
    if (!lib || !question) return []
    return lib.questions
      .filter((q) => q.id !== question.id && q.category === question.category && q.type === question.type)
      .map((q) => ({ q, score: overlap(question, q) }))
      .sort((a, b) => b.score - a.score || b.q.year - a.q.year)
      .slice(0, limit)
      .map((x) => x.q)
  }, [lib, question, limit])

  if (!items.length) return null

  return (
    <details className="similar-block">
      <summary>
        <Layers size={15} />
        <span>同类题 · {items.length} 道</span>
        <ChevronDown size={15} className="similar-arrow" />
      </summary>
      <ul className="similar-list">
        {items.map((q) => (
          <li key={q.id}>
            <Link to={`/q/${q.id}`}>
              <span className="similar-meta">
                {q.year} · {q.number} · {q.typeName}
              </span>
              <span className="similar-stem" dangerouslySetInnerHTML={{ __html: q.stemHtml || q.stem }} />
            </Link>
          </li>
        ))}
      </ul>
      <div className="similar-hint">同分类、同题型，共享考点越多越靠前；新增题目会自动参与计算</div>
    </details>
  )
}
