import katex from 'katex'

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function tex(src, display = false) {
  try {
    return katex.renderToString(src, {
      displayMode: display,
      throwOnError: true,
      strict: false,
      output: 'html',
    })
  } catch {
    return `<code class="rt-tex-fallback">${escapeHtml(src)}</code>`
  }
}

const MATH_CHAR = /[A-Za-z0-9\s{}^_=+\-*/()[\]|,.'\\]/

function wrapBareTex(text) {
  const re = /\\[a-zA-Z]+/g
  const ranges = []
  let m
  while ((m = re.exec(text))) {
    let a = m.index
    while (a > 0 && MATH_CHAR.test(text[a - 1]) && m.index - a < 60) a--
    let b = m.index
    let depth = 0
    while (b < text.length && b - a < 300) {
      const ch = text[b]
      if (ch === '\\') {
        b++
        while (b < text.length && /[a-zA-Z]/.test(text[b])) b++
        continue
      }
      if (ch === '{') {
        depth++
        b++
        continue
      }
      if (ch === '}') {
        depth = Math.max(0, depth - 1)
        b++
        continue
      }
      if (depth === 0 && !MATH_CHAR.test(ch)) break
      b++
    }
    while (a < b && /\s/.test(text[a])) a++
    while (b > a && /\s/.test(text[b - 1])) b--
    if (b - a >= 3) ranges.push([a, b])
  }
  ranges.sort((x, y) => x[0] - y[0])
  const merged = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  let res = ''
  let pos = 0
  for (const [a, b] of merged) {
    res += text.slice(pos, a) + `$${text.slice(a, b)}$`
    pos = b
  }
  res += text.slice(pos)
  return res
}

function inline(text) {
  let s = escapeHtml(text)
  const stash = []
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, t) => {
    stash.push(tex(t, true))
    return `\u0000${stash.length - 1}\u0000`
  })
  s = s.replace(/\$([^$\n]+?)\$/g, (m, t) => {
    stash.push(tex(t, false))
    return `\u0000${stash.length - 1}\u0000`
  })
  s = wrapBareTex(s)
  s = s.replace(/\$([^$\n]+?)\$/g, (m, t) => tex(t, false))
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[Number(i)] || '')
  return s
}

export function renderRichText(text) {
  const lines = String(text || '').split(/\r?\n/)
  const out = []
  let list = null

  const flush = () => {
    if (list) {
      out.push(`<${list.tag} class="rt-list">${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`)
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (/^-{3,}$/.test(line)) {
      flush()
      out.push('<hr class="rt-hr"/>')
      continue
    }
    if (/^#{1,4}\s+/.test(line)) {
      flush()
      out.push(`<h4 class="rt-h">${inline(line.replace(/^#{1,4}\s+/, ''))}</h4>`)
      continue
    }
    if (/^(第[一二三四五六七八九十百]+步|小结|终极|💡)/.test(line)) {
      flush()
      out.push(`<h4 class="rt-h">${inline(line)}</h4>`)
      continue
    }
    if (/^\\[a-zA-Z]/.test(line) && !/[\u4e00-\u9fa5]/.test(line.replace(/\\[a-zA-Z]+\{[^{}]*\}/g, ''))) {
      flush()
      out.push(`<div class="rt-formula">${tex(line, true)}</div>`)
      continue
    }
    const onlyTex = line.match(/^\$\$([\s\S]+?)\$\$$/)
    if (onlyTex) {
      flush()
      out.push(`<div class="rt-formula">${tex(onlyTex[1], true)}</div>`)
      continue
    }
    const ol = line.match(/^(\d+)[.、)]\s*(.*)$/)
    if (ol) {
      if (!list || list.tag !== 'ol') {
        flush()
        list = { tag: 'ol', items: [] }
      }
      list.items.push(inline(ol[2]))
      continue
    }
    const ul = line.match(/^[-•·]\s+(.*)$/)
    if (ul) {
      if (!list || list.tag !== 'ul') {
        flush()
        list = { tag: 'ul', items: [] }
      }
      list.items.push(inline(ul[1]))
      continue
    }
    flush()
    out.push(`<p class="rt-p">${inline(line)}</p>`)
  }
  flush()
  return out.join('')
}
