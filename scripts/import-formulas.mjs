/**
 * 导入「竞赛非数 A 公式大全」为结构化内容源
 * 用法: node scripts/import-formulas.mjs
 * 输出: content/formulas/math-competition.json
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'E:/考研/数学/数学竞赛/真题详解/竞赛非数A-公式大全-汇总版.html'
const OUT_DIR = path.resolve('content/formulas')

const html = fs.readFileSync(SRC, 'utf8')

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

const sections = [...html.matchAll(/<section class="sec"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => m[1])
const chapters = []
let total = 0

sections.forEach((sec, si) => {
  const no = textOf((sec.match(/<span class="sno">([\s\S]*?)<\/span>/) || [])[1] || '')
  const title = textOf((sec.match(/<h2 class="stitle">([\s\S]*?)<\/h2>/) || [])[1] || '')
  const freqHtml = (sec.match(/<div class="freq">([\s\S]*?)<\/div>/) || [])[1] || ''
  const leadHtml = (sec.match(/<p class="lead">([\s\S]*?)<\/p>/) || [])[1] || ''

  const grpRe = /<div class="grp"><h3>([\s\S]*?)<\/h3>([\s\S]*?)(?=<div class="grp">|<\/section>|$)/g
  const groups = []
  let gm
  let gi = 0
  while ((gm = grpRe.exec(sec))) {
    gi++
    const gtitle = textOf(gm[1])
    const body = gm[2]
    const chunks = body.split('<div class="row">').slice(1)
    const formulas = []

    chunks.forEach((chunk, ci) => {
      const nameHtml = (chunk.match(/<p class="rname">([\s\S]*?)<\/p>/) || [])[1] || ''
      const ev = textOf((nameHtml.match(/<span class="ev">([\s\S]*?)<\/span>/) || [])[1] || '')
      const name = textOf(nameHtml.replace(/<span class="ev">[\s\S]*?<\/span>/, ''))
      const fm = (chunk.match(/<div class="fm">([\s\S]*?)<\/div>/) || [])[1] || ''
      const tip = (chunk.match(/<p class="tip">([\s\S]*?)<\/p>/) || [])[1] || ''
      if (!name || !fm) return

      formulas.push({
        seq: ci + 1,
        id: `f-${si + 1}-${gi}-${ci + 1}`,
        name,
        expr: fm.trim(),
        tags: ev ? ev.split(/\s+/).filter(Boolean) : [],
        tip: tip.replace(/<b>[\s\S]*?<\/b>/g, '').trim(),
      })
      total++
    })

    if (formulas.length) groups.push({ seq: gi, title: gtitle, formulas })
  }

  if (groups.length) {
    chapters.push({
      seq: si + 1,
      id: `ch-${si + 1}`,
      no: no || `第 ${si + 1} 章`,
      title,
      freq: freqHtml.trim(),
      lead: leadHtml.trim(),
      groups,
    })
  }
})

fs.mkdirSync(OUT_DIR, { recursive: true })
const out = {
  subject: 'math',
  kind: 'formula',
  title: '竞赛公式大全',
  subtitle: '全国大学生数学竞赛 · 非数学 A 类 · 1–17 届初赛校准',
  chapters,
}
fs.writeFileSync(path.join(OUT_DIR, 'math-competition.json'), JSON.stringify(out, null, 2) + '\n', 'utf8')

console.log(`章节: ${chapters.length} / 小节: ${chapters.reduce((n, c) => n + c.groups.length, 0)} / 公式: ${total}`)
console.log(`输出: ${path.join(OUT_DIR, 'math-competition.json')}`)

const sample = chapters[0]?.groups[0]?.formulas[0]
console.log('样本:', JSON.stringify(sample, null, 2).slice(0, 500))
