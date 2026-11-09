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
      'SELECT id, question_id, mime, created_at FROM notes WHERE user_id = ? AND question_id = ? ORDER BY created_at ASC',
    )
      .bind(user.id, qid)
      .all()
    const notes = (rows.results || []).map((r) => ({
      id: r.id,
      questionId: r.question_id,
      createdAt: r.created_at,
      url: `/api/files/${r.id}`,
    }))
    return json({ notes })
  }

  if (path === '/notes' && method === 'POST') {
    const user = await currentUser(request, env)
    if (!user) return json({ error: '未登录' }, 401)
    const body = await request.json().catch(() => ({}))
    const qid = String(body.questionId || '')
    const mime = String(body.mime || 'image/jpeg')
    const data = String(body.data || '').replace(/^data:[^;]+;base64,/, '')
    if (!qid || !data) return json({ error: '参数不完整' }, 400)
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) return json({ error: '只支持 JPG / PNG / WebP' }, 400)
    const bytes = Math.floor((data.length * 3) / 4)
    if (bytes > MAX_BYTES) return json({ error: '图片超过 800KB，请压缩后再传' }, 413)
    const id = crypto.randomUUID()
    await env.DB.prepare(
      'INSERT INTO notes (id, user_id, question_id, mime, data, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(id, user.id, qid, mime, data, Date.now())
      .run()
    return json({ id, url: `/api/files/${id}`, size: bytes })
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
