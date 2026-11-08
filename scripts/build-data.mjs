/**
 * 构建题库数据
 * - 读取 content/subjects.json 与各分类内容
 * - 用 KaTeX 在构建期预渲染公式
 * - 输出 public/data/library.json（索引）+ public/data/questions/<id>.json（详情分片）
 */
import fs from 'node:fs'
import path from 'node:path'
import katex from 'katex'

const ROOT = process.cwd()
const CONTENT = path.join(ROOT, 'content')
const OUT = path.join(ROOT, 'public', 'data')
const OUT_Q = path.join(OUT, 'questions')

const TYPE_NAMES = { fill: '填空题', choice: '选择题', solution: '解答题' }

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

function renderMath(html) {
  if (!html) return ''
  let out = String(html)
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => {
    try {
      return (
        '<div class="katex-display">' +
        katex.renderToString(decodeEntities(tex.trim()), { displayMode: true, throwOnError: false, strict: false, output: 'htmlAndMathml', macros: { '\\avg': '\\operatorname{avg}' } }) +
        '</div>'
      )
    } catch {
      return m
    }
  })
  out = out.replace(/\$([^$\n]+?)\$/g, (m, tex) => {
    try {
      return katex.renderToString(decodeEntities(tex.trim()), { displayMode: false, throwOnError: false, strict: false, output: 'htmlAndMathml', macros: { '\\avg': '\\operatorname{avg}' } })
    } catch {
      return m
    }
  })
  return out.replace(/＿{2,}/g, '<span class="blank" aria-label="填空"></span>')
}

function renderMathLite(html) {
  if (!html) return ''
  let out = String(html)
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => {
    try {
      return katex.renderToString(decodeEntities(tex.trim()), { displayMode: false, throwOnError: false, strict: false, output: 'html', macros: { '\\avg': '\\operatorname{avg}' } })
    } catch {
      return m
    }
  })
  out = out.replace(/\$([^$\n]+?)\$/g, (m, tex) => {
    try {
      return katex.renderToString(decodeEntities(tex.trim()), { displayMode: false, throwOnError: false, strict: false, output: 'html', macros: { '\\avg': '\\operatorname{avg}' } })
    } catch {
      return m
    }
  })
  return out.replace(/＿{2,}/g, '<span class="blank" aria-label="填空"></span>')
}

function previewSource(html, max = 70, maxMath = 2) {
  if (!html) return ''
  const src = String(html)
  const tokens = src.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/)
  let out = ''
  let visible = 0
  let math = 0

  for (const tok of tokens) {
    if (!tok) continue
    if (tok.startsWith('$')) {
      if (math >= maxMath) break
      math++
      out += tok
      visible += 6
    } else {
      const text = tok.replace(/<[^>]+>/g, '')
      if (visible + text.length > max) {
        out += text.slice(0, Math.max(0, max - visible))
        visible = max
        break
      }
      out += text
      visible += text.length
    }
    if (visible >= max) break
  }

  if (!out) out = src.slice(0, max).replace(/<[^>]+>/g, '')
  if (out.length < src.length) {
    const d = (out.match(/\$/g) || []).length
    if (d % 2 === 1) out = out.slice(0, out.lastIndexOf('$'))
    out += '…'
  }
  return out
}

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
  theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', phi: 'φ', varphi: 'φ',
  omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', times: '×', cdot: '·',
  cdots: '…', ldots: '…', leq: '≤', leqslant: '≤', geq: '≥', geqslant: '≥',
  neq: '≠', infty: '∞', partial: '∂', int: '∫', iint: '∬', iiint: '∭',
  sum: '∑', prod: '∏', to: '→', rightarrow: '→', Rightarrow: '⇒',
  in: '∈', forall: '∀', exists: '∃', lim: 'lim', ln: 'ln', log: 'log',
  sin: 'sin', cos: 'cos', tan: 'tan', max: 'max', min: 'min',
}

function latexToText(tex) {
  let s = String(tex || '')
  s = s.replace(/\\text\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\mathrm\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\operatorname\{([^{}]*)\}/g, '$1')
  s = s.replace(/\^\{([^{}]*)\}/g, '^$1')
  s = s.replace(/_\{([^{}]*)\}/g, '_$1')
  s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
  s = s.replace(/\\left|\\right/g, '')
  s = s.replace(/\\([a-zA-Z]+)/g, (m, name) => GREEK[name] ?? '')
  s = s.replace(/\\[,;!: ]/g, '')
  s = s.replace(/[{}]/g, '')
  s = s.replace(/[\\$]/g, '')
  s = s.replace(/\s+/g, ' ')
  return s.trim()
}

function plain(html) {
  let s = String(html || '')
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => ' ' + latexToText(tex) + ' ')
  s = s.replace(/\$([^$]*)\$/g, (m, tex) => latexToText(tex))
  s = s.replace(/<[^>]+>/g, ' ')
  s = s.replace(/&nbsp;/g, ' ')
  s = s.replace(/&lt;/g, '<')
  s = s.replace(/&gt;/g, '>')
  s = s.replace(/&amp;/g, '&')
  s = s.replace(/[ \t\r\n]+/g, ' ')
  s = s.replace(/[，、]\s*(?=[，、。；])/g, '')
  s = s.replace(/＿+/g, '＿＿')
  return s.trim()
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT_Q, { recursive: true })

const registry = readJSON(path.join(CONTENT, 'subjects.json'))
const index = []
const questions = []

for (const subject of registry.subjects) {
  if (subject.status !== 'ready') {
    index.push({ ...subject, count: 0, groups: (subject.groups || []).map((g) => ({ ...g, count: 0, categories: (g.categories || []).map((c) => ({ ...c, count: 0, years: [], types: [], tags: [] })) })) })
    continue
  }

  let subjectCount = 0
  const groups = []

  for (const group of subject.groups || []) {
    let groupCount = 0
    const categories = []

    for (const cat of group.categories || []) {
      const dir = path.join(CONTENT, cat.dir)
      if (!fs.existsSync(dir)) {
        categories.push({ ...cat, count: 0, years: [], types: [], tags: [] })
        continue
      }

      const files = fs.readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f)).sort()
      const papers = files.map((f) => readJSON(path.join(dir, f)))
      const yearMap = new Map()
      const typeMap = new Map()
      const tagMap = new Map()

      for (const paper of papers) {
        let yearCount = 0
        for (const q of paper.questions || []) {
          const id = `${subject.id}-${group.id}-${cat.id}-${paper.year}-${String(q.seq).padStart(2, '0')}`
          const stemText = plain(q.stemHtml)
          const stemHtml = renderMath(q.stemHtml)
          const previewHtml = renderMathLite(previewSource(q.stemHtml))
          const tags = [
            ...new Set(
              (q.tags || [])
                .map((t) => latexToText(t).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim())
                .filter((t) => t.length >= 2 && t.length <= 18),
            ),
          ]
          const steps = (q.steps || []).map((s) => ({ title: renderMathLite(s.title || ''), html: renderMath(s.html) }))
          const moral = q.moral
            ? {
                title: renderMathLite(q.moral.title || ''),
                lead: renderMath(q.moral.lead || ''),
                items: (q.moral.items || []).map((it) => renderMath(it)),
              }
            : null
          const answerHtml = renderMath(q.answerHtml || '')
          const formulasUsed = (q.formulasUsed || []).map((f) => ({
            name: f.name,
            expr: renderMath(f.latex),
          }))
          const typeName = TYPE_NAMES[q.type] || '解答题'

          const detail = { id, stem: stemHtml, steps, moral, answer: answerHtml, formulas: formulasUsed }
          fs.writeFileSync(path.join(OUT_Q, `${id}.json`), JSON.stringify(detail), 'utf8')

          const search = [String(paper.year), q.number, typeName, ...(q.tags || []), stemText].join(' ')

          questions.push({
            id,
            subject: subject.id,
            group: group.id,
            category: cat.id,
            year: paper.year,
            edition: paper.edition,
            paper: paper.paper,
            number: q.number,
            type: q.type,
            typeName,
            title: latexToText(q.title || ''),
            tags,
            difficulty: q.difficulty || 3,
            source: `${paper.source || paper.paper} · ${q.number}`,
            stem: stemText.slice(0, 110),
            preview: previewHtml,
            search,
            steps: (q.steps || []).length,
            hasMoral: !!q.moral,
          })

          yearCount++
          subjectCount++
          groupCount++
          typeMap.set(q.type, (typeMap.get(q.type) || 0) + 1)
          for (const t of tags) tagMap.set(t, (tagMap.get(t) || 0) + 1)
        }
        yearMap.set(paper.year, { year: paper.year, paper: paper.paper, count: yearCount })
      }

      categories.push({
        ...cat,
        count: papers.reduce((n, p) => n + (p.questions || []).length, 0),
        years: [...yearMap.values()].sort((a, b) => b.year - a.year),
        types: [...typeMap.entries()].map(([id, count]) => ({ id, name: TYPE_NAMES[id] || id, count })).sort((a, b) => b.count - a.count),
        tags: [...tagMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 40),
      })
    }

    groups.push({ ...group, count: groupCount, categories })
  }

  index.push({ ...subject, count: subjectCount, groups })
}

questions.sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))

const library = {
  version: 1,
  generatedAt: new Date().toISOString(),
  subjects: index,
  totals: {
    subjects: index.filter((s) => s.status === 'ready').length,
    questions: questions.length,
  },
  questions,
}

fs.writeFileSync(path.join(OUT, 'library.json'), JSON.stringify(library), 'utf8')

const kb = (n) => (n / 1024).toFixed(1) + ' KB'
const detailSize = fs.readdirSync(OUT_Q).reduce((n, f) => n + fs.statSync(path.join(OUT_Q, f)).size, 0)
console.log(`科目: ${library.totals.subjects} / 题目: ${library.totals.questions}`)
console.log(`索引: ${kb(fs.statSync(path.join(OUT, 'library.json')).size)}`)
console.log(`详情: ${fs.readdirSync(OUT_Q).length} 个文件 / ${kb(detailSize)}`)
console.log(`输出: ${OUT}`)
