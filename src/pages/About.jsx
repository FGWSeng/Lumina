import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLibrary } from '../lib/data'

export default function About() {
  const [lib, setLib] = useState(null)

  useEffect(() => {
    getLibrary().then(setLib)
  }, [])

  return (
    <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
      <main className="main" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
        <div className="crumb">
          <Link to="/">首页</Link>
          <span className="sep">/</span>
          <span style={{ color: 'var(--ink-2)' }}>说明</span>
        </div>

        <h1 className="serif" style={{ fontSize: 28, margin: '6px 0 10px' }}>
          关于这个题库
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>
          一个纯静态的多科目题库：题目、答案与分步解析都在构建时预渲染好，打开就能看，不依赖后端。
        </p>

        <div className="card" style={{ padding: 22, marginTop: 18 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>怎么用</h2>
          <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--ink-2)', lineHeight: 2 }}>
            <li>从首页选科目，进入后按年份、题型或考点筛选。</li>
            <li>点开题目，先自己判断「这题考什么」，再展开答案与解析。</li>
            <li>解析按步骤拆开，最后一段是「学霸心法」，用来迁移到同类题。</li>
            <li>收藏与掌握度只存在本机浏览器，不上传服务器。</li>
          </ol>
        </div>

        <div className="card" style={{ padding: 22, marginTop: 14 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>收录范围</h2>
          <div className="row wrap" style={{ gap: 8, marginBottom: 14 }}>
            <span className="chip brand">数学竞赛 · 初赛</span>
            <span className="chip">17 届</span>
            <span className="chip">{lib?.totals?.questions ?? '—'} 题</span>
            <span className="chip gold">持续扩展</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 12 }}>
                <th style={{ padding: '6px 0', fontWeight: 600 }}>科目</th>
                <th style={{ padding: '6px 0', fontWeight: 600 }}>状态</th>
                <th style={{ padding: '6px 0', fontWeight: 600, textAlign: 'right' }}>题量</th>
              </tr>
            </thead>
            <tbody>
              {(lib?.subjects || []).map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 0' }}>{s.name}</td>
                  <td style={{ padding: '8px 0', color: 'var(--muted)' }}>{s.status === 'ready' ? '已开放' : '筹备中'}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.status === 'ready' ? s.count : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 22, marginTop: 14 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>扩展方式</h2>
          <p className="small" style={{ color: 'var(--ink-2)', marginTop: 0 }}>
            新增科目不改页面代码：在 <code>content/subjects.json</code> 注册科目与分类，把题目放进对应目录，构建时自动生成索引与分片。
          </p>
          <pre
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.8,
              overflowX: 'auto',
              margin: 0,
              color: 'var(--ink-2)',
            }}
          >{`content/
  subjects.json          # 科目 / 题库 / 分类注册表
  math/competition/2009.json
  english/reading/2026.json
  politics/theory/2026.json`}</pre>
        </div>

        <div className="card" style={{ padding: 22, marginTop: 14 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>技术说明</h2>
          <div className="row wrap" style={{ gap: 6 }}>
            {['React 19', 'Vite 8', 'Tailwind CSS 4', 'KaTeX 预渲染', 'Cloudflare Pages', 'localStorage'].map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
          <p className="tiny muted" style={{ marginBottom: 0, marginTop: 12 }}>
            公式在构建阶段渲染为 HTML，运行时不再计算；题目按 id 分片加载，索引与详情分离。
          </p>
        </div>
      </main>
    </div>
  )
}
