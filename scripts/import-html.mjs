/**
 * 把「真题详解」HTML 导入为统一内容源
 * 用法: npm run import
 * 输出: content/math/competition/<year>.json
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC_DIR = 'E:/考研/数学/数学竞赛/真题详解'
const OUT_DIR = path.resolve('content/math/competition')

const files = fs
  .readdirSync(SRC_DIR)
  .filter((f) => /^第\d+届-初赛解析与精讲\.html$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))

function textOf(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanTags(src) {
  return src
    .split(/＋/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 24)
    .filter((s) => !/[\u0000-\u001f]/.test(s))
    .slice(0, 6)
}

function stripTagSpan(stemHtml) {
  return stemHtml.replace(/<span class="tag">[\s\S]*?<\/span>/, '').trim()
}

function parseQuestion(article, seq, year, stageName) {
  const qno = textOf((article.match(/<span class="qno">([\s\S]*?)<\/span>/) || [])[1] || '') || `第 ${seq} 题`
  const srcRaw = textOf((article.match(/<span class="src">([\s\S]*?)<\/span>/) || [])[1] || '')

  const stemMatch = article.match(/<div class="stem">([\s\S]*?)<\/div>/)
  const stemHtml = stemMatch ? stripTagSpan(stemMatch[1]) : ''

  const steps = []
  const stepRe = /<section class="step">([\s\S]*?)<\/section>/g
  let m
  while ((m = stepRe.exec(article))) {
    const block = m[1]
    const h3 = block.match(/<h3>([\s\S]*?)<\/h3>/)
    const title = h3 ? textOf(h3[1]) : ''
    const html = h3 ? block.replace(h3[0], '').trim() : block.trim()
    if (html) steps.push({ title, html })
  }

  let moral = null
  const moralMatch = article.match(/<div class="moral">([\s\S]*?)<\/div>/)
  if (moralMatch) {
    const block = moralMatch[1]
    const h3 = block.match(/<h3>([\s\S]*?)<\/h3>/)
    const lead = block.match(/<p class="lead">([\s\S]*?)<\/p>/)
    const items = []
    const liRe = /<li>([\s\S]*?)<\/li>/g
    let li
    while ((li = liRe.exec(block))) items.push(li[1].trim())
    moral = {
      title: h3 ? textOf(h3[1]) : '学霸心法',
      lead: lead ? lead[1].trim() : '',
      items,
    }
  }

  let answerHtml = ''
  const ansMatch = article.match(/<div class="ans">([\s\S]*?)<\/div>/)
  if (ansMatch) answerHtml = ansMatch[1].replace(/<b>[\s\S]*?<\/b>/, '').trim()

  const type = qno.includes('填空') ? 'fill' : qno.includes('选择') ? 'choice' : 'solution'
  const tags = cleanTags(srcRaw)
  const difficulty = Math.min(5, Math.max(1, (type === 'fill' ? 2 : 3) + (steps.length >= 4 ? 1 : 0)))

  return {
    seq,
    number: qno,
    type,
    title: tags[0] || `${stageName}第 ${seq} 题`,
    tags,
    difficulty,
    stemHtml,
    steps,
    moral,
    answerHtml,
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true })

let total = 0
for (const file of files) {
  const raw = fs.readFileSync(path.join(SRC_DIR, file), 'utf8')
  const no = parseInt(file.match(/\d+/)[0])
  const titleText = textOf((raw.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '')
  const yearMatch = titleText.match(/(\d{4})/)
  const year = yearMatch ? parseInt(yearMatch[1]) : 2008 + no
  const h1 = textOf((raw.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || '')
  const paper = h1 || titleText || `第${no}届`

  const articles = [...raw.matchAll(/<article class="q"[^>]*>([\s\S]*?)<\/article>/g)].map((m) => m[1])
  const questions = articles.map((a, i) => parseQuestion(a, i + 1, year, paper))

  const out = {
    year,
    stage: 'prelim',
    stageName: '初赛',
    paper,
    edition: no,
    source: `第${no}届（${year}）初赛`,
    questions,
  }
  fs.writeFileSync(path.join(OUT_DIR, `${year}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8')
  total += questions.length
  console.log(`${file} -> ${year}.json  ${questions.length} 题`)
}

console.log(`\n完成：${files.length} 届 / ${total} 题`)
