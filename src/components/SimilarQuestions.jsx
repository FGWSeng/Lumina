import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Layers } from 'lucide-react'
import { getLibrary } from '../lib/data'

function tagsOverlap(a, b) {
  const sa = new Set((a.tags || []).map((t) => t.trim()))
  let n = 0
  for (const t of b.tags || []) if (sa.has(t.trim())) n++
  return n
}

function cleanTag(t) {
  return String(t || '').replace(/[^\u4e00-\u9fa5A-Za-z0-9^∞]/g, '')
}

function titleHitsTags(title, tags) {
  const text = String(title || '')
  let n = 0
  for (const tag of tags || []) {
    const c = cleanTag(tag)
    if (c.length >= 2 && text.includes(c)) n++
  }
  return n
}

function bigrams(s) {
  const t = String(s || '')
  const set = new Set()
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2))
  return set
}

function titleSimilarity(a, b) {
  const ga = bigrams(a)
  const gb = bigrams(b)
  let n = 0
  for (const g of ga) if (gb.has(g)) n++
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

  const { main, secondary, cross } = useMemo(() => {
    if (!lib || !question) return { main: [], secondary: [], cross: [] }
    const isTraining = question?.category === 'training'
    const qs = lib.questions

    let main = []
    let secondary = []
    let cross = []

    if (isTraining) {
      const sameChapter = qs.filter(
        (q) => q.id !== question.id && q.category === 'training' && q.chapter === question.chapter,
      )
      const scored = sameChapter
        .map((q) => ({ q, s: titleSimilarity(question.title, q.title) }))
        .sort((a, b) => b.s - a.s || a.q.id.localeCompare(b.q.id))

      main = scored.filter((x) => x.s >= 2).slice(0, limit).map((x) => x.q)
      const mainIds = new Set(main.map((q) => q.id))
      secondary = scored
        .filter((x) => !mainIds.has(x.q.id))
        .slice(0, 4)
        .map((x) => x.q)

      cross = qs
        .filter((q) => q.category === 'prelim')
        .map((q) => ({ q, s: titleSimilarity(question.title, (q.tags || []).join(' ')) }))
        .filter((x) => x.s >= 2)
        .sort((a, b) => b.s - a.s || b.q.year - a.q.year)
        .slice(0, 4)
        .map((x) => x.q)
    } else {
      main = qs
        .filter((q) => q.id !== question.id && q.category === 'prelim')
        .map((q) => ({ q, s: tagsOverlap(question, q) }))
        .filter((x) => x.s >= 1)
        .sort((a, b) => b.s - a.s || b.q.year - a.q.year)
        .slice(0, limit)
        .map((x) => x.q)

      const mainIds = new Set(main.map((q) => q.id))
      const chapters = question.trainingChapters || []
      secondary = qs
        .filter(
          (q) =>
            q.id !== question.id &&
            q.category === 'prelim' &&
            !mainIds.has(q.id) &&
            chapters.length > 0 &&
            (q.trainingChapters || []).some((c) => chapters.includes(c)),
        )
        .map((q) => ({ q, hit: (q.trainingChapters || []).filter((c) => chapters.includes(c)).length }))
        .sort((a, b) => b.hit - a.hit || b.q.year - a.q.year)
        .slice(0, 4)
        .map((x) => x.q)

      cross = qs
        .filter((q) => q.category === 'training')
        .map((q) => ({ q, s: titleHitsTags(q.title, question.tags) }))
        .filter((x) => x.s >= 1)
        .sort((a, b) => b.s - a.s || a.q.chapter - b.q.chapter)
        .slice(0, 4)
        .map((x) => x.q)
    }

    return { main, secondary, cross }
  }, [lib, question, limit])

  const isTraining = question?.category === 'training'

  if (!main.length && !secondary.length && !cross.length) {
    return (
      <div className="similar-block adjacent">
        <div className="similar-empty">按当前题库，没有考点重合的同类题。</div>
      </div>
    )
  }

  return (
    <details className="similar-block">
      <summary>
        <Layers size={15} />
        <span>
          同类题 · {main.length + secondary.length + cross.length} 道
          {cross.length ? `（相关${isTraining ? '真题' : '训练'} ${cross.length} 道）` : ''}
        </span>
        <ChevronDown size={15} className="similar-arrow" />
      </summary>

      {main.length > 0 && (
        <div className="similar-group">
          <div className="similar-group-title">
            {isTraining ? '同章同思路' : '考点重合'} · {main.length}
          </div>
          <ul className="similar-list">
            {main.map((q) => (
              <Item key={q.id} q={q} />
            ))}
          </ul>
        </div>
      )}

      {secondary.length > 0 && (
        <div className="similar-group">
          <div className="similar-group-title">
            {isTraining ? '同章其他' : '同章相关'} · {secondary.length}
          </div>
          <ul className="similar-list">
            {secondary.map((q) => (
              <Item key={q.id} q={q} />
            ))}
          </ul>
        </div>
      )}

      {cross.length > 0 && (
        <div className="similar-group">
          <div className="similar-group-title">
            {isTraining ? '相关真题' : '能力拓展（相关）'} · {cross.length}
          </div>
          <ul className="similar-list">
            {cross.map((q) => (
              <Item key={q.id} q={q} />
            ))}
          </ul>
        </div>
      )}

      <div className="similar-hint">
        {isTraining
          ? '同章内按手法标题相似度取题；相关真题按考点标签与标题重合度匹配'
          : '只保留考点标签有交集的题，交集越多越靠前；不再用同题型凑数'}
      </div>
    </details>
  )
}
