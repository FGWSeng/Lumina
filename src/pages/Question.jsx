import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Eye, Lightbulb, ListChecks, Sigma, StickyNote } from 'lucide-react'
import { findQuestion, getLibrary, getQuestion, questionNeighbors } from '../lib/data'
import { Difficulty, Tags } from '../components/ui'
import { MASTERY, getMastery, isFavorite, setMastery, toggleFavorite, useStore } from '../lib/store'
import QuestionNotes from '../components/QuestionNotes'
import SimilarQuestions from '../components/SimilarQuestions'

export default function Question() {
  const { questionId } = useParams()
  const navigate = useNavigate()
  const store = useStore()
  const [lib, setLib] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExplain, setShowExplain] = useState(false)
  const [showFormulas, setShowFormulas] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    getLibrary().then(setLib)
  }, [])

  useEffect(() => {
    setDetail(null)
    setError('')
    setShowAnswer(false)
    setShowExplain(false)
    setShowFormulas(false)
    setShowNotes(false)
    getQuestion(questionId)
      .then(setDetail)
      .catch((e) => setError(e.message))
  }, [questionId])

  const q = lib ? findQuestion(lib, questionId) : null
  const { prev, next, index, total } = lib ? questionNeighbors(lib, questionId) : { prev: null, next: null, index: -1, total: 0 }
  const fav = isFavorite(questionId)
  const mastery = getMastery(questionId)

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && prev) navigate(`/q/${prev.id}`)
      if (e.key === 'ArrowRight' && next) navigate(`/q/${next.id}`)
      if (e.key === 'a' || e.key === 'A') setShowAnswer((v) => !v)
      if (e.key === 'e' || e.key === 'E') setShowExplain((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, navigate])

  if (error) {
    return (
      <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div className="empty">
          <div className="big">{error}</div>
          <Link to="/s/math" className="btn" style={{ marginTop: 12 }}>
            返回题库
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
      <main className="main detail-wrap">
        <div className="crumb">
          <Link to="/">首页</Link>
          <span className="sep">/</span>
          <Link to="/s/math">数学</Link>
          <span className="sep">/</span>
          <span>{q?.year || '…'}</span>
          <span className="sep">/</span>
          <span style={{ color: 'var(--ink-2)' }}>{q?.number || '加载中'}</span>
        </div>

        <article className="card q-card">
          <div className="q-head">
            <span className="q-no">{q?.number || '…'}</span>
            <span className="q-src">{q?.source}</span>
            {q && <Difficulty value={q.difficulty} />}
            <span className="q-src" style={{ marginLeft: 'auto' }}>
              {q?.typeName}
            </span>
          </div>

          <h1 className="q-title" style={{ fontSize: 20, margin: '0 0 10px', lineHeight: 1.5 }}>
            {q?.title || '正在加载题目…'}
          </h1>

          {q && (
            <div className="row wrap" style={{ marginBottom: 12 }}>
              <Tags items={q.tags} max={6} tone="gold" />
            </div>
          )}

          {detail ? (
            <div className="q-stem" dangerouslySetInnerHTML={{ __html: detail.stem }} />
          ) : (
            <div className="muted small" style={{ padding: '24px 0' }}>
              正在加载题干…
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
            <button className={`btn ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(questionId)}>
              {fav ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {fav ? '已收藏' : '收藏'}
            </button>
            {MASTERY.map((m) => (
              <button
                key={m.id}
                className={`btn ${mastery === m.id ? 'on' : ''} ${m.id === 'mastered' ? 'wide' : ''}`}
                onClick={() => setMastery(questionId, m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>

          {showAnswer && detail && (
            <div className="answer-box reveal">
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

          {showNotes && <QuestionNotes questionId={questionId} />}

          {showExplain && detail && (
            <>
              <div className="explain-box reveal">
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
          <button className="btn sm" disabled={!prev} onClick={() => prev && navigate(`/q/${prev.id}`)}>
            <ArrowLeft size={14} /> 上一题
          </button>
          <span className="pos">
            {index >= 0 ? index + 1 : '—'} / {total}
          </span>
          <button className="btn sm" disabled={!next} onClick={() => next && navigate(`/q/${next.id}`)}>
            下一题 <ArrowRight size={14} />
          </button>
        </div>

        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 10 }}>
          快捷键：← → 翻题 · A 答案 · E 解析
        </div>
      </main>
    </div>
  )
}
