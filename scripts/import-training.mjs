/**
 * 导入「能力拓展与训练」8 章题目
 * 用法: node scripts/import-training.mjs
 * 输出: content/math/training/ch1.json ... ch8.json
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC_DIR = 'E:/考研/数学/数学竞赛/真题详解'
const OUT_DIR = path.resolve('content/math/training')

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

function parseChapter(file, chapterNo) {
  const html = fs.readFileSync(path.join(SRC_DIR, file), 'utf8')
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  const fullTitle = textOf(h1 ? h1[1] : '')
  const nameMatch = fullTitle.match(/第\s*\d+\s*章\s*([\s\S]*?)\d+\.\d+/)
  const chapterName = (nameMatch ? nameMatch[1] : fullTitle).replace(/\s+/g, '').trim()

  const articles = [...html.matchAll(/<article class="q"[^>]*>([\s\S]*?)<\/article>/g)].map((m) => m[1])
  const questions = []

  articles.forEach((a, i) => {
    const qno = textOf((a.match(/<span class="qno">([\s\S]*?)<\/span>/) || [])[1] || `题 ${i + 1}`)
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

    const answer = (a.match(/<div class="ans">([\s\S]*?)<\/div>/) || [])[1] || ''
    const concl = (a.match(/<p class="concl">([\s\S]*?)<\/p>/) || [])[1] || ''

    questions.push({
      seq: i + 1,
      number: qno,
      title: src,
      chapter: chapterNo,
      stemHtml: stem,
      steps,
      moral,
      answerHtml: answer,
      concl,
      formulasUsed,
    })
  })

  return { chapter: chapterNo, chapterName, title: fullTitle, questions }
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const files = fs
  .readdirSync(SRC_DIR)
  .filter((f) => /^第\d+章-能力拓展与训练-解析与精讲\.html$/.test(f))
  .sort((a, b) => Number(a.match(/第(\d+)章/)[1]) - Number(b.match(/第(\d+)章/)[1]))

let total = 0
const chapters = []
for (const f of files) {
  const no = Number(f.match(/第(\d+)章/)[1])
  const data = parseChapter(f, no)
  const out = {
    subject: 'math',
    group: 'competition',
    category: 'training',
    ...data,
  }
  fs.writeFileSync(path.join(OUT_DIR, `ch${no}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8')
  total += data.questions.length
  chapters.push({ no, name: data.chapterName, count: data.questions.length })
  console.log(`第${no}章 ${data.chapterName} -> ${data.questions.length} 题`)
}
console.log(`\n合计 ${chapters.length} 章 / ${total} 题`)
fs.writeFileSync(path.join(OUT_DIR, '_index.json'), JSON.stringify({ chapters }, null, 2) + '\n', 'utf8')
