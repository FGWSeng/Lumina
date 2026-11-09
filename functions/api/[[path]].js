const COOKIE = 'lumina_uid'
const MAX_BYTES = 800 * 1024

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return ''
}

async function currentUser(request, env) {
  const uid = getCookie(request, COOKIE)
  if (!uid) return null
  try {
    return await env.DB.prepare('SELECT id, name, color FROM users WHERE id = ?').bind(uid).first()
  } catch {
    return null
  }
}

function sessionCookie(uid) {
  return `${COOKIE}=${encodeURIComponent(uid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
}

export async function onRequest(context) {
  const { request, env, params } = context
  const url = new URL(request.url)
  const path = '/' + (params.path || []).join('/')
  const method = request.method

  if (path === '/auth/me' && method === 'GET') {
    const user = await currentUser(request, env)
    return json({ user })
  }

  if (path === '/auth/switch' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const uid = String(body.userId || '')
    const user = await env.DB.prepare('SELECT id, name, color FROM users WHERE id = ?').bind(uid).first()
    if (!user) return json({ error: '账号不存在' }, 400)
    return json({ user }, 200, { 'Set-Cookie': sessionCookie(user.id) })
  }

  if (path === '/auth/logout' && method === 'POST') {
    return json({ ok: true }, 200, {
      'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    })
  }

  if (path === '/folders' && method === 'GET') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const folders = await env.DB.prepare(
      'SELECT id, parent_id, name, created_at FROM folders WHERE user_id = ? ORDER BY name ASC',
    )
      .bind(user.id)
      .all()
    const counts = await env.DB.prepare(
      'SELECT folder_id, COUNT(*) AS n FROM folder_items WHERE user_id = ? GROUP BY folder_id',
    )
      .bind(user.id)
      .all()
    const map = {}
    for (const c of counts.results || []) map[c.folder_id] = c.n
    return json({
      folders: (folders.results || []).map((f) => ({
        id: f.id,
        parentId: f.parent_id,
        name: f.name,
        createdAt: f.created_at,
        count: map[f.id] || 0,
      })),
    })
  }

  if (path === '/folders' && method === 'POST') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim().slice(0, 40)
    const parentId = body.parentId ? String(body.parentId) : null
    if (!name) return json({ error: '文件夹名不能为空' }, 400)
    if (parentId) {
      const parent = await env.DB.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?')
        .bind(parentId, user.id)
        .first()
      if (!parent) return json({ error: '上级文件夹不存在' }, 404)
    }
    const id = crypto.randomUUID()
    await env.DB.prepare('INSERT INTO folders (id, user_id, parent_id, name, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, user.id, parentId, name, Date.now())
      .run()
    return json({ id, name, parentId })
  }

  const folderItems = path.match(/^\/folders\/([^/]+)\/items$/)
  if (folderItems && method === 'GET') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const fid = folderItems[1]
    const rows = await env.DB.prepare(
      'SELECT id, kind, text_content, mime, created_at FROM folder_items WHERE user_id = ? AND folder_id = ? ORDER BY created_at ASC',
    )
      .bind(user.id, fid)
      .all()
    return json({
      items: (rows.results || []).map((r) => ({
        id: r.id,
        kind: r.kind,
        text: r.text_content || '',
        mime: r.mime || '',
        createdAt: r.created_at,
        url: r.kind === 'image' ? `/api/items/${r.id}/file` : '',
      })),
    })
  }

  if (folderItems && method === 'POST') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const fid = folderItems[1]
    const folder = await env.DB.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?')
      .bind(fid, user.id)
      .first()
    if (!folder) return json({ error: '文件夹不存在' }, 404)
    const body = await request.json().catch(() => ({}))
    const kind = String(body.kind || '')
    if (kind === 'text') {
      const text = String(body.text || '').trim().slice(0, 5000)
      if (!text) return json({ error: '内容不能为空' }, 400)
      const id = crypto.randomUUID()
      await env.DB.prepare(
        'INSERT INTO folder_items (id, user_id, folder_id, kind, text_content, mime, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(id, user.id, fid, 'text', text, '', '', Date.now())
        .run()
      return json({ id, kind: 'text', text })
    }
    if (kind === 'image') {
      const mime = String(body.mime || 'image/jpeg')
      const data = String(body.data || '').replace(/^data:[^;]+;base64,/, '')
      if (!/^image\/(jpeg|png|webp)$/.test(mime)) return json({ error: '只支持 JPG / PNG / WebP' }, 400)
      if (!data) return json({ error: '图片为空' }, 400)
      const bytes = Math.floor((data.length * 3) / 4)
      if (bytes > MAX_BYTES) return json({ error: '图片超过 800KB，请压缩后再传' }, 413)
      const id = crypto.randomUUID()
      await env.DB.prepare(
        'INSERT INTO folder_items (id, user_id, folder_id, kind, text_content, mime, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(id, user.id, fid, 'image', '', mime, data, Date.now())
        .run()
      return json({ id, kind: 'image', url: `/api/items/${id}/file` })
    }
    return json({ error: '未知类型' }, 400)
  }

  const folderOne = path.match(/^\/folders\/([^/]+)$/)
  if (folderOne && method === 'PATCH') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim().slice(0, 40)
    if (!name) return json({ error: '文件夹名不能为空' }, 400)
    await env.DB.prepare('UPDATE folders SET name = ? WHERE id = ? AND user_id = ?')
      .bind(name, folderOne[1], user.id)
      .run()
    return json({ ok: true, name })
  }

  if (folderOne && method === 'DELETE') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const root = folderOne[1]
    const subs = await env.DB.prepare(
      'WITH RECURSIVE sub(id) AS (SELECT id FROM folders WHERE id = ? AND user_id = ? UNION ALL SELECT f.id FROM folders f JOIN sub ON f.parent_id = sub.id WHERE f.user_id = ?) SELECT id FROM sub',
    )
      .bind(root, user.id, user.id)
      .all()
    const ids = (subs.results || []).map((r) => r.id)
    if (ids.length) {
      const ph = ids.map(() => '?').join(',')
      await env.DB.prepare(`DELETE FROM folder_items WHERE user_id = ? AND folder_id IN (${ph})`)
        .bind(user.id, ...ids)
        .run()
      await env.DB.prepare(`DELETE FROM folders WHERE user_id = ? AND id IN (${ph})`)
        .bind(user.id, ...ids)
        .run()
    }
    return json({ ok: true, removed: ids.length })
  }

  const itemOne = path.match(/^\/items\/([^/]+)$/)
  if (itemOne && method === 'DELETE') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    await env.DB.prepare('DELETE FROM folder_items WHERE id = ? AND user_id = ?').bind(itemOne[1], user.id).run()
    return json({ ok: true })
  }

  const itemFile = path.match(/^\/items\/([^/]+)\/file$/)
  if (itemFile && method === 'GET') {
    const user = await currentUser(request, env)
    if (!user) return new Response('unauthorized', { status: 401 })
    const row = await env.DB.prepare('SELECT mime, data FROM folder_items WHERE id = ? AND user_id = ? AND kind = ?')
      .bind(itemFile[1], user.id, 'image')
      .first()
    if (!row) return new Response('not found', { status: 404 })
    const binary = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0))
    return new Response(binary, {
      headers: {
        'Content-Type': row.mime,
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  if (path === '/picks/dates' && method === 'GET') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const rows = await env.DB.prepare(
      'SELECT pick_date, COUNT(*) AS n FROM daily_picks WHERE user_id = ? GROUP BY pick_date ORDER BY pick_date DESC LIMIT 180',
    )
      .bind(user.id)
      .all()
    return json({ dates: (rows.results || []).map((r) => ({ date: r.pick_date, count: r.n })) })
  }

  if (path === '/picks' && method === 'GET') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const date = url.searchParams.get('date') || ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: '日期格式应为 YYYY-MM-DD' }, 400)
    const rows = await env.DB.prepare(
      'SELECT id, question_id, pick_date, created_at FROM daily_picks WHERE user_id = ? AND pick_date = ? ORDER BY created_at ASC',
    )
      .bind(user.id, date)
      .all()
    return json({
      picks: (rows.results || []).map((r) => ({
        id: r.id,
        questionId: r.question_id,
        date: r.pick_date,
        createdAt: r.created_at,
      })),
    })
  }

  if (path === '/picks' && method === 'POST') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const body = await request.json().catch(() => ({}))
    const qid = String(body.questionId || '')
    const date = String(body.date || '')
    if (!qid || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: '参数不完整' }, 400)
    await env.DB.prepare(
      'INSERT OR IGNORE INTO daily_picks (id, user_id, question_id, pick_date, created_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(crypto.randomUUID(), user.id, qid, date, Date.now())
      .run()
    const row = await env.DB.prepare(
      'SELECT id FROM daily_picks WHERE user_id = ? AND question_id = ? AND pick_date = ?',
    )
      .bind(user.id, qid, date)
      .first()
    return json({ id: row?.id || '', date })
  }

  if (path.startsWith('/picks/') && method === 'DELETE') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const id = path.slice('/picks/'.length)
    await env.DB.prepare('DELETE FROM daily_picks WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return json({ ok: true })
  }

  if (path === '/favorites' && method === 'GET') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const rows = await env.DB.prepare(
      'SELECT question_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    )
      .bind(user.id)
      .all()
    return json({
      favorites: (rows.results || []).map((r) => ({ questionId: r.question_id, createdAt: r.created_at })),
    })
  }

  if (path === '/favorites' && method === 'POST') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const body = await request.json().catch(() => ({}))
    const qid = String(body.questionId || '')
    if (!qid) return json({ error: '缺少 questionId' }, 400)
    await env.DB.prepare('INSERT OR IGNORE INTO favorites (user_id, question_id, created_at) VALUES (?, ?, ?)')
      .bind(user.id, qid, Date.now())
      .run()
    return json({ ok: true })
  }

  if (path.startsWith('/favorites/') && method === 'DELETE') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const qid = decodeURIComponent(path.slice('/favorites/'.length))
    await env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND question_id = ?').bind(user.id, qid).run()
    return json({ ok: true })
  }

  if (path === '/notes' && method === 'GET') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const qid = url.searchParams.get('questionId') || ''
    if (!qid) return json({ notes: [] })
    const rows = await env.DB.prepare(
      'SELECT id, question_id, mime, kind, content, title, created_at FROM notes WHERE user_id = ? AND question_id = ? ORDER BY created_at ASC',
    )
      .bind(user.id, qid)
      .all()
    const notes = (rows.results || []).map((r) => ({
      id: r.id,
      questionId: r.question_id,
      kind: r.kind || 'image',
      content: r.content || '',
      title: r.title || '',
      createdAt: r.created_at,
      url: (r.kind || 'image') === 'image' ? `/api/files/${r.id}` : '',
    }))
    return json({ notes })
  }

  if (path === '/notes' && method === 'POST') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const body = await request.json().catch(() => ({}))
    const qid = String(body.questionId || '')
    const kind = String(body.kind || 'image')

    if (kind === 'text') {
      const content = String(body.content || '').trim().slice(0, 20000)
      const title = String(body.title || '').trim().slice(0, 60)
      if (!qid || !content) return json({ error: '内容不能为空' }, 400)
      const id = crypto.randomUUID()
      await env.DB.prepare(
        'INSERT INTO notes (id, user_id, question_id, mime, data, created_at, kind, content, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(id, user.id, qid, '', '', Date.now(), 'text', content, title)
        .run()
      return json({ id, kind: 'text', content, title })
    }

    const mime = String(body.mime || 'image/jpeg')
    const data = String(body.data || '').replace(/^data:[^;]+;base64,/, '')
    if (!qid || !data) return json({ error: '参数不完整' }, 400)
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) return json({ error: '只支持 JPG / PNG / WebP' }, 400)
    const bytes = Math.floor((data.length * 3) / 4)
    if (bytes > MAX_BYTES) return json({ error: '图片超过 800KB，请压缩后再传' }, 413)
    const id = crypto.randomUUID()
    await env.DB.prepare(
      'INSERT INTO notes (id, user_id, question_id, mime, data, created_at, kind, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(id, user.id, qid, mime, data, Date.now(), 'image', '')
      .run()
    return json({ id, url: `/api/files/${id}`, size: bytes })
  }

  if (path.startsWith('/notes/') && method === 'PATCH') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const id = path.slice('/notes/'.length)
    const body = await request.json().catch(() => ({}))
    const title = String(body.title || '').trim().slice(0, 60)
    const content = String(body.content || '').trim().slice(0, 20000)
    if (!content) return json({ error: '内容不能为空' }, 400)
    const row = await env.DB.prepare('SELECT kind FROM notes WHERE id = ? AND user_id = ?').bind(id, user.id).first()
    if (!row) return json({ error: '笔记不存在' }, 404)
    if ((row.kind || 'image') !== 'text') return json({ error: '只有文字笔记可编辑' }, 400)
    await env.DB.prepare('UPDATE notes SET title = ?, content = ? WHERE id = ? AND user_id = ?')
      .bind(title, content, id, user.id)
      .run()
    return json({ ok: true, title, content })
  }

  if (path.startsWith('/notes/') && method === 'DELETE') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const id = path.slice('/notes/'.length)
    await env.DB.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return json({ ok: true })
  }

  if (path.startsWith('/files/') && method === 'GET') {
    const user = await currentUser(request, env)
    if (!user) return new Response('unauthorized', { status: 401 })
    const id = path.slice('/files/'.length)
    const row = await env.DB.prepare('SELECT mime, data FROM notes WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first()
    if (!row) return new Response('not found', { status: 404 })
    const binary = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0))
    return new Response(binary, {
      headers: {
        'Content-Type': row.mime,
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  return json({ error: 'not found' }, 404)
}
