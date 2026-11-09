import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Landmark, Layers, Sigma, Star } from 'lucide-react'
import { getLibrary } from '../lib/data'

const ICONS = { sigma: Sigma, book: BookOpen, landmark: Landmark, layers: Layers }

export default function Home() {
  const [lib, setLib] = useState(null)

  useEffect(() => {
    getLibrary().then(setLib)
  }, [])

  const subjects = lib?.subjects || []
  const latest = (lib?.questions || []).slice(-4).reverse()

  return (
    <div className="shell" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <main className="main" style={{ maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        <section className="hero">
          <div className="eyebrow">Lumina · 点点积累</div>
          <h1>
            把每一道题，
            <br />
            变成一次真正的理解。
          </h1>
          <p>
            按科目与题型整理真题，先看题、再想考点，展开才是分步解析与心法。当前收录数学竞赛初赛 17 届，英语、政治与专业课将持续接入。
          </p>
          <div className="row wrap" style={{ marginTop: 18 }}>
            <Link to="/s/math" className="btn primary">
              开始刷题 <ArrowRight size={16} />
            </Link>
            <Link to="/picks" className="btn">
              <Star size={15} /> 今日好题
            </Link>
            <Link to="/about" className="btn">
              了解收录范围
            </Link>
          </div>
        </section>

        <div className="row wrap" style={{ gap: 22, marginBottom: 26 }}>
          <Stat value={lib?.totals?.questions ?? '—'} label="题目总数" />
          <Stat value={17} label="届真题" />
          <Stat value={subjects.filter((s) => s.status === 'ready').length} label="已开放科目" />
          <Stat value="4" label="规划科目" />
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>按科目进入</h2>
          <span className="small muted">新增科目只需注册一条配置</span>
        </div>

        <div className="subject-grid">
          {subjects.map((s) => {
            const Icon = ICONS[s.icon] || Layers
            const ready = s.status === 'ready'
            const inner = (
              <>
                <div className="subject-icon">
                  <Icon size={20} />
                </div>
                <div>
                  <div className="subject-name">{s.name}</div>
                  <div className="subject-desc">{s.desc}</div>
                </div>
                <div className="subject-foot">
                  <span className="subject-count">{ready ? `${s.count} 题` : '筹备中'}</span>
                  <span className={`chip ${ready ? 'brand' : ''}`}>{ready ? '进入' : '敬请期待'}</span>
                </div>
              </>
            )
            return ready ? (
              <Link key={s.id} to={`/s/${s.id}`} className="card subject-card">
                {inner}
              </Link>
            ) : (
              <div key={s.id} className="card subject-card coming">
                {inner}
              </div>
            )
          })}
        </div>

        {latest.length > 0 && (
          <>
            <div className="row" style={{ justifyContent: 'space-between', margin: '30px 0 12px' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>最近收录</h2>
              <Link to="/s/math" className="small" style={{ color: 'var(--brand)' }}>
                查看全部
              </Link>
            </div>
            <div className="card">
              {latest.map((q) => (
                <Link key={q.id} to={`/q/${q.id}`} className="list-item">
                  <div className="row wrap" style={{ marginBottom: 4 }}>
                    <span className="q-no">{q.number}</span>
                    <span className="q-src">{q.year} · {q.typeName}</span>
                  </div>
                  <div className="list-title">
                    <strong style={{ fontWeight: 600 }}>{q.title}</strong>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)', lineHeight: 1.2 }}>{value}</div>
      <div className="tiny muted">{label}</div>
    </div>
  )
}
