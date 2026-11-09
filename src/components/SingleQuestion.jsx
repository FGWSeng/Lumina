import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Eye, Lightbulb, ListChecks, Sigma, StickyNote } from 'lucide-react'
import { getQuestion } from '../lib/data'
import { Difficulty, Hint } from './ui'
import { MASTERY, getMastery, isFavorite, setMastery, toggleFavorite, useStore } from '../lib/store'
import QuestionNotes from './QuestionNotes'
import SimilarQuestions from './SimilarQuestions'
import PickButton from './PickButton'

export default function SingleQuestion({ list, currentId, onSelect }) {
  useStore()
  const idx = Math.max(0, list.findIndex((q) => q.id === currentId))
  const q = list[idx] || list[0]
  const [detail, setDetail] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExplain, setShowExplain] = useState(false)
  const [showFormulas, setShowFormulas] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const answerRef = useRef(null)
  const explainRef = useRef(null)

  useEffect(() => {
    if (q && q.id !== currentId) onSelect(q.id, true)
  }, [q?.id])

  useEffect(() => {
    if (!q) return
    let alive = true
    setDetail(null)
    setShowAnswer(false)
    setShowExplain(false)
    setShowFormulas(false)
    setShowNotes(false)
    getQuestion(q.id)
      .then((d) => alive && setDetail(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [q?.id])

  useEffect(() => {
    const next = list[idx + 1]
    if (next) getQuestion(next.id).catch(() => {})
  }, [idx, list])

  useEffect(() => {
    if (!showAnswer || !answerRef.current || window.innerWidth >= 700) return
    requestAnimationFrame(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [showAnswer])

  useEffect(() => {
    if (!showExplain || !explainRef.current || window.innerWidth >= 700) return
    requestAnimationFrame(() => explainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [showExplain])

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && idx > 0) onSelect(list[idx - 1].id)
      if (e.key === 'ArrowRight' && idx < list.length - 1) onSelect(list[idx + 1].id)
      if (e.key === 'a' || e.key === 'A') setShowAnswer((v) => !v)
      if (e.key === 'e' || e.key === 'E') setShowExplain((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, list, onSelect])

  if (!q) return <div className="empty">当前筛选下没有题目</div>

  const fav = isFavorite(q.id)
  const mastery = getMastery(q.id)

  return (
    <div className="single">
      <article className="card q-card">
        <div className="q-head">
          <span className="q-no">{q.number}</span>
          <span className="q-src">{q.source}</span>
          <Difficulty value={q.difficulty} />
          <span className="q-src" style={{ marginLeft: 'auto' }}>
            {q.typeName}
          </span>
        </div>

        <h1 className="q-title" style={{ fontSize: 20, margin: '0 0 10px', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: q.titleHtml || q.title }} />

        <div className="row wrap" style={{ marginBottom: 14 }}>
          <Hint tags={q.tagsHtml || q.tags} />
        </div>

        {detail ? (
          <div className="q-stem" dangerouslySetInnerHTML={{ __html: detail.stem }} />
        ) : (
          <div className="stem-skeleton">
            <span />
            <span />
            <span />
          </div>
        )}

        <div className="q-actions">
          <button className={`btn ${showAnswer ? 'on' : ''} half`} onClick={() => setShowAnswer((v) => !v)}>
            <Eye size={15} /> 答案
          </button>
          <button className={`btn ${showExplain ? 'on' : ''} half`} onClick={() => setShowExplain((v) => !v)}>
            <ListChecks size={15} /> 解析
          </button>
          <button className={`btn ${showFormulas ? 'on' : ''} half`} onClick={() => setShowFormulas((v) => !v)}>
            <Sigma size={15} /> 公式
          </button>
          <button className={`btn ${showNotes ? 'on' : ''} half`} onClick={() => setShowNotes((v) => !v)}>
            <StickyNote size={15} /> 笔记
          </button>
          <span className="spacer" />
          <PickButton questionId={q.id} />
          <button className={`btn ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(q.id)}>
            {fav ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {fav ? '已收藏' : '收藏'}
          </button>
          {MASTERY.map((m) => (
            <button
              key={m.id}
              className={`btn ${mastery === m.id ? 'on' : ''} ${m.id === 'mastered' ? 'wide' : ''}`}
              onClick={() => setMastery(q.id, m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>

        {showAnswer && detail && (
          <div className="answer-box reveal" ref={answerRef}>
            <div className="label">答案</div>
            <div className="body" dangerouslySetInnerHTML={{ __html: detail.answer || '<span class="muted">暂无答案</span>' }} />
          </div>
        )}

        {showFormulas && detail && detail.formulas?.length > 0 && (
          <div className="formula-used reveal">
            <div className="label">本题用到的公式</div>
            <ol>
              {detail.formulas.map((f, i) => (
                <li key={i}>
                  <span className="fu-name">{f.name}</span>
                  <div className="fu-expr" dangerouslySetInnerHTML={{ __html: f.expr }} />
                </li>
              ))}
            </ol>
          </div>
        )}

        {showNotes && <QuestionNotes questionId={q.id} />}

        {showExplain && detail && (
          <>
            <div className="explain-box reveal" ref={explainRef}>
              <div className="label">解析 · 分步拆解</div>
              {detail.steps?.length ? (
                detail.steps.map((s, i) => (
                  <div className="step" key={i}>
                    {s.title && <h4 dangerouslySetInnerHTML={{ __html: s.title }} />}
                    <div dangerouslySetInnerHTML={{ __html: s.html }} />
                  </div>
                ))
              ) : (
                <div className="small muted">暂无分步解析</div>
              )}
            </div>

            {detail.moral && (
              <div className="moral-box reveal">
                <h4>
                  <Lightbulb size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  <span dangerouslySetInnerHTML={{ __html: detail.moral.title }} />
                </h4>
                {detail.moral.lead && <p className="lead" dangerouslySetInnerHTML={{ __html: detail.moral.lead }} />}
                {detail.moral.items?.length > 0 && (
                  <ol>
                    {detail.moral.items.map((it, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
                    ))}
                  </ol>
                )}
              </div>
            )}
          </>
        )}
        <SimilarQuestions question={q} />
      </article>

      <div className="pager">
        <button className="btn sm" disabled={idx <= 0} onClick={() => idx > 0 && onSelect(list[idx - 1].id)}>
          <ArrowLeft size={14} /> 上一题
        </button>
        <span className="pos">
          {idx + 1} / {list.length}
        </span>
        <button className="btn sm" disabled={idx >= list.length - 1} onClick={() => onSelect(list[idx + 1].id)}>
          下一题 <ArrowRight size={14} />
        </button>
      </div>

      <div className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>
        快捷键：← → 翻题 · A 答案 · E 解析
      </div>
    </div>
  )
}
