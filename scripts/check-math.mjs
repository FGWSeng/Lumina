import fs from 'node:fs'
import path from 'node:path'
import katex from 'katex'

const dir = 'content/math/competition'
let total = 0
const fails = []

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const paper = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  for (const q of paper.questions) {
    const parts = [
      ['stem', q.stemHtml],
      ...(q.steps || []).map((s, i) => [`step${i + 1}`, s.html]),
      ['answer', q.answerHtml],
      ['moral-lead', q.moral?.lead],
      ...(q.moral?.items || []).map((it, i) => [`moral${i + 1}`, it]),
    ]
    for (const [where, html] of parts) {
      if (!html) continue
      const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
      let m
      while ((m = re.exec(html))) {
        const tex = decodeEntities((m[1] || m[2] || '').trim())
        total++
        try {
          katex.renderToString(tex, { displayMode: !!m[1], throwOnError: true, strict: false })
        } catch (e) {
          fails.push({ file: f, no: q.number, where, tex: tex.slice(0, 90), err: e.message.slice(0, 90) })
        }
      }
    }
  }
}

console.log('公式总数:', total, '/ 失败:', fails.length)
const byErr = {}
fails.forEach((x) => { byErr[x.err] = (byErr[x.err] || 0) + 1 })
console.log('\n错误类型:')
Object.entries(byErr).sort((a, b) => b[1] - a[1]).forEach(([e, n]) => console.log(' ', n, e))
console.log('\n前 25 条:')
fails.slice(0, 25).forEach((x) => console.log(` ${x.file} ${x.no} ${x.where} | ${x.tex} | ${x.err}`))
