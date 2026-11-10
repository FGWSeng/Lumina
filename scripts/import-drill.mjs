/**
 * 导入「公式训练场」36 道精讲题
 * 输出: content/math/drill/drill.json
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'E:/考研/数学/数学竞赛/真题详解/竞赛非数A-公式训练场-108题精讲.html'
const OUT_DIR = path.resolve('content/math/drill')
const OUT = path.join(OUT_DIR, 'drill.json')

function textOf(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const html = fs.readFileSync(SRC, 'utf8')
const articles = [...html.matchAll(/<article class="q"[^>]*>([\s\S]*?)<\/article>/g)].map((m) => m[1])

const questions = articles.map((a, i) => {
  const qno = textOf((a.match(/<span class="qno">([\s\S]*?)<\/span>/) || [])[1] || `第 ${i + 1} 题`)
  const src = textOf((a.match(/<span class="src">([\s\S]*?)<\/span>/) || [])[1] || '')
  let stem = (a.match(/<div class="stem">([\s\S]*?)<\/div>/) || [])[1] || ''
  stem = stem.replace(/<span class="tag">[\s\S]*?<\/span>/g, '').trim()

  const fxBlock = a.match(/<div class="fx">([\s\S]*?)<\/ol>/)
  const formulasUsed = []
  if (fxBlock) {
    const liRe = /<li>([\s\S]*?)<\/li>/g
    let li
    while ((li = liRe.exec(fxBlock[1]))) {
      const block = li[1]
      const name = textOf((block.match(/<span class="n">([\s\S]*?)<\/span>/) || [])[1] || '')
      const fms = [...block.matchAll(/<div class="fm">([\s\S]*?)<\/div>/g)].map((m) => m[1].trim())
      if (name && fms.length) formulasUsed.push({ name, latex: fms.join('\n') })
    }
  }

  const steps = [...a.matchAll(/<section class="step">([\s\S]*?)<\/section>/g)].map((m) => {
    const block = m[1]
    const title = textOf((block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/) || [])[1] || '')
    const body = block.replace(/<h4[^>]*>[\s\S]*?<\/h4>/, '').trim()
    return { title, html: body }
  })

  const moralBlock = a.match(/<div class="moral">([\s\S]*?)<\/div>/)
  let moral = null
  if (moralBlock) {
    const m = moralBlock[1]
    const title = textOf((m.match(/<h4[^>]*>([\s\S]*?)<\/h4>/) || [])[1] || '')
    const lead = (m.match(/<p class="lead">([\s\S]*?)<\/p>/) || [])[1] || ''
    const items = [...m.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1].trim())
    moral = { title, lead, items }
  }

  const answerHtml = (a.match(/<div class="ans">([\s\S]*?)<\/div>/) || [])[1] || ''
  const concl = (a.match(/<p class="concl">([\s\S]*?)<\/p>/) || [])[1] || ''

  return {
    seq: i + 1,
    number: qno,
    title: src,
    stemHtml: stem,
    steps,
    moral,
    answerHtml,
    concl,
    formulasUsed,
  }
})

fs.mkdirSync(OUT_DIR, { recursive: true })
const out = {
  subject: 'math',
  group: 'competition',
  category: 'drill',
  key: 'drill',
  chapter: null,
  chapterName: '公式训练场',
  title: '公式训练场 · 108 题按公式大全逐章攻一遍',
  questions,
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(`公式训练场 -> ${questions.length} 题`)
