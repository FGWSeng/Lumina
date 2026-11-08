/**
 * 内容源校验：npm run check
 * 检查科目注册、目录存在、题目字段完整、id 唯一
 */
import fs from 'node:fs'
import path from 'node:path'

const CONTENT = path.resolve('content')
const registry = JSON.parse(fs.readFileSync(path.join(CONTENT, 'subjects.json'), 'utf8'))
const errors = []
const ids = new Set()
let total = 0

for (const subject of registry.subjects) {
  if (!subject.id || !subject.name) errors.push(`科目缺少 id/name: ${JSON.stringify(subject).slice(0, 60)}`)
  if (subject.status !== 'ready') continue

  for (const group of subject.groups || []) {
    for (const cat of group.categories || []) {
      const dir = path.join(CONTENT, cat.dir || '')
      if (!cat.dir || !fs.existsSync(dir)) {
        errors.push(`目录不存在: ${subject.id}/${group.id}/${cat.id} -> ${cat.dir}`)
        continue
      }
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
      for (const f of files) {
        if (!/^\d{4}\.json$/.test(f)) errors.push(`文件名不规范（应为 YYYY.json）: ${cat.dir}/${f}`)
        const paper = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
        if (!paper.year) errors.push(`${cat.dir}/${f} 缺少 year`)
        if (!Array.isArray(paper.questions)) errors.push(`${cat.dir}/${f} questions 不是数组`)
        for (const q of paper.questions || []) {
          total++
          const id = `${subject.id}-${group.id}-${cat.id}-${paper.year}-${String(q.seq).padStart(2, '0')}`
          if (ids.has(id)) errors.push(`id 重复: ${id}`)
          ids.add(id)
          if (!q.number) errors.push(`${id} 缺少 number`)
          if (!q.stemHtml) errors.push(`${id} 缺少 stemHtml`)
          if (!['fill', 'choice', 'solution'].includes(q.type)) errors.push(`${id} type 非法: ${q.type}`)
          if (!q.tags?.length) errors.push(`${id} 没有 tags（可接受，但建议补）`)
        }
      }
    }
  }
}

console.log(`题目总数: ${total} / 唯一 id: ${ids.size}`)
if (errors.length) {
  console.log(`\n发现 ${errors.length} 个问题:`)
  errors.slice(0, 40).forEach((e) => console.log(' -', e))
  process.exitCode = 1
} else {
  console.log('校验通过，无问题。')
}
