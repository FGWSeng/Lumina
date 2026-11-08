/**
 * 构建公式数据：预渲染 KaTeX + 生成推导思路/记忆技巧
 * 输出: public/data/formulas.json
 */
import fs from 'node:fs'
import path from 'node:path'
import katex from 'katex'

const SRC = path.resolve('content/formulas/math-competition.json')
const OUT = path.resolve('public/data/formulas.json')

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
        katex.renderToString(decodeEntities(tex.trim()), { displayMode: true, throwOnError: false, strict: false, output: 'html' }) +
        '</div>'
      )
    } catch {
      return m
    }
  })
  out = out.replace(/\$([^$\n]+?)\$/g, (m, tex) => {
    try {
      return katex.renderToString(decodeEntities(tex.trim()), { displayMode: false, throwOnError: false, strict: false, output: 'html' })
    } catch {
      return m
    }
  })
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

function latexToText(html) {
  let s = String(html || '').replace(/<[^>]+>/g, ' ')
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => ' ' + texToText(tex) + ' ')
  s = s.replace(/\$([^$\n]+?)\$/g, (m, tex) => texToText(tex))
  return s.replace(/[ \t\r\n]+/g, ' ').trim()
}

function texToText(tex) {
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
  return s.replace(/\s+/g, ' ').trim()
}

const RULES = [
  { k: /二项式|幂差|立方和|有限和|求和|裂项|数列/, start: '从乘法分配律与等比数列求和公式出发', end: '逐项展开、合并同类项，整理成闭式；注意 n 的取值范围' },
  { k: /三角|和差|倍角|半角|辅助角|万能|积化|和差化积|反三角/, start: '从和角公式（或单位圆上的投影）出发', end: '令 β=α 得倍角，两式相加减得积化和差；反三角注意主值区间' },
  { k: /不等式|柯西|均值|AM-GM|绝对值|放缩|夹逼/, start: '从平方非负（或二次函数判别式）出发', end: '整理成平方和或乘积形式；取等条件为各项成比例' },
  { k: /等价无穷小|阶|渐近|无穷大|无穷小/, start: '从泰勒展开截断到首项出发', end: '比较同阶项系数；等价关系只在 x→0 时成立' },
  { k: /导数|求导|微分|高阶导|莱布尼茨|隐函数/, start: '从导数定义 f′(x)=lim Δy/Δx 出发', end: '逐项求导或用链式/乘积法则；先确认可导前提' },
  { k: /中值|Rolle|Lagrange|介值|达布/, start: '构造辅助函数 F（参考 4.4 构造表）', end: '验证区间条件后由定理得存在 ξ，再整理成要证的式子' },
  { k: /Taylor|泰勒|展开|余项|Peano/, start: '从带余项的 Taylor 公式出发', end: '在 x₀ 处逐阶求导代入，按分母阶数截断；余项按用途选 Peano 或 Lagrange' },
  { k: /积分|原函数|换元|分部|Wallis|Γ|反常|定积分|变限/, start: '从基本积分表，或换元/分部积分出发', end: '对结果求导验证；注意积分常数、换元换限与收敛性' },
  { k: /重积分|二重|三重|雅可比|极坐标|柱坐标|球坐标|截面/, start: '先画区域，确定内外层积分限', end: '换元时乘雅可比 |J|，化为累次积分；对称性可先砍一半' },
  { k: /曲线积分|曲面积分|Green|Gauss|Stokes|散度|旋度/, start: '先确认曲线/曲面的定向与是否封闭', end: '用 Green/Gauss/Stokes 化为重积分；不闭则补面并统一方向' },
  { k: /微分方程|ODE|通解|特解|齐次|常系数|积分因子/, start: '判断方程类型，化为标准形式', end: '按对应解法积分得通解，再用初值定常数' },
  { k: /级数|收敛|发散|幂级数|Fourier|Abel|Dirichlet|Leibniz/, start: '从通项或部分和出发', end: '选择判敛法（比较/比值/根值/积分）；幂级数先求收敛半径' },
  { k: /向量|叉积|点积|混合积|平面|直线|曲面|切平面|法线/, start: '写成坐标形式', end: '代入点积/叉积或距离公式，整理成方程' },
  { k: /速查|数值|恒等式|易错/, start: '由基本恒等式直接变形', end: '代入特殊值核对符号与适用条件' },
]

const FALLBACK = { start: '从基本定义或上一节结论出发', end: '整理后得到该式，使用时注意适用条件' }

function buildDerive(chapterTitle, groupTitle, name, tip) {
  const hay = `${chapterTitle} ${groupTitle} ${name}`
  const rule = RULES.find((r) => r.k.test(hay)) || FALLBACK
  const sentences = String(tip || '')
    .split(/[。；]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const key = sentences[0]
  const rest = sentences.slice(1).join('；')

  let derive
  let memory
  if (sentences.length >= 2) {
    derive = [rule.start, `关键在于：${key}`, rule.end]
    memory = rest
  } else {
    derive = [rule.start, '按定义逐步化简，先处理结构最复杂的一项，再逐项对齐', rule.end]
    memory = key || '结合真题体会用法，注意符号与适用条件。'
  }

  return {
    derive: derive.map(renderMath),
    memory: renderMath(memory),
  }
}

function splitSteps(html) {
  const s = String(html || '').trim()
  if (!s) return []
  const parts = s
    .split(/(?<=[。；])/)
    .map((x) => x.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts : [s]
}

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'))
let count = 0
let jjCount = 0
const chapters = src.chapters.map((ch) => ({
  id: ch.id,
  no: ch.no,
  title: ch.title,
  freq: renderMath(ch.freq),
  lead: renderMath(ch.lead),
  groups: ch.groups.map((g) => ({
    id: `${ch.id}-${g.seq}`,
    seq: g.seq,
    no: `${ch.seq}.${g.seq}`,
    title: g.title,
    formulas: g.formulas.map((f) => {
      count++
      let derive
      let memory
      let when
      let source
      if (f.deriveHtml && f.memoryHtml) {
        derive = splitSteps(f.deriveHtml).map(renderMath)
        memory = renderMath(f.memoryHtml)
        when = renderMath(f.whenHtml || '')
        source = 'jingjiang'
        jjCount++
      } else {
        const r = buildDerive(ch.title, g.title, f.name, f.tip)
        derive = r.derive
        memory = r.memory
        when = ''
        source = 'auto'
      }
      return {
        id: f.id,
        name: f.name,
        expr: renderMath(f.expr),
        tags: f.tags,
        derive,
        memory,
        when,
        source,
      }
    }),
  })),
}))

const out = {
  title: src.title,
  subtitle: src.subtitle,
  count,
  generatedAt: new Date().toISOString(),
  chapters,
}

fs.writeFileSync(OUT, JSON.stringify(out), 'utf8')
const kb = (fs.statSync(OUT).size / 1024).toFixed(1)
console.log(`章节 ${chapters.length} / 公式 ${count} / 精讲 ${jjCount} / 体积 ${kb} KB`)
console.log(`输出 ${OUT}`)
