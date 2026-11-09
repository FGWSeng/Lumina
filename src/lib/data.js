let libraryPromise = null
const detailCache = new Map()

export function getLibrary() {
  if (!libraryPromise) {
    libraryPromise = fetch(`${import.meta.env.BASE_URL}data/library.json`).then((r) => {
      if (!r.ok) throw new Error('题库索引加载失败')
      return r.json()
    })
  }
  return libraryPromise
}

export function getQuestion(id) {
  if (!detailCache.has(id)) {
    detailCache.set(
      id,
      getLibrary()
        .then((lib) => {
          const v = lib?.version || ''
          return fetch(`${import.meta.env.BASE_URL}data/questions/${id}.json?v=${encodeURIComponent(v)}`)
        })
        .then((r) => {
          if (!r.ok) throw new Error('题目加载失败')
          return r.json()
        }),
    )
  }
  return detailCache.get(id)
}

export function findSubject(library, id) {
  return library?.subjects?.find((s) => s.id === id) || null
}

export function findQuestion(library, id) {
  return library?.questions?.find((q) => q.id === id) || null
}

export function questionNeighbors(library, id) {
  const list = library?.questions || []
  const i = list.findIndex((q) => q.id === id)
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null, index: i, total: list.length }
}

export function filterQuestions(list, { subject, group, category, type, year, tag, q }) {
  const kw = (q || '').trim().toLowerCase()
  return list.filter((item) => {
    if (subject && item.subject !== subject) return false
    if (group && item.group !== group) return false
    if (category && item.category !== category) return false
    if (type && item.type !== type) return false
    if (year) {
      if (category === 'training') {
        if (item.chapter !== Number(year)) return false
      } else if (item.year !== Number(year)) return false
    }
    if (tag && !(item.tags || []).includes(tag)) return false
    if (kw) {
      const hay = `${item.title} ${item.stem} ${(item.tags || []).join(' ')} ${item.search}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}
