import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FileText, FolderPlus, GripVertical, ImagePlus, ListOrdered, Maximize2, Pencil, Trash2, X } from 'lucide-react'
import ImageViewer from './ImageViewer'
import NoteUploader from './NoteUploader'
import { useUser } from '../lib/auth'
import { renderRichText } from '../lib/richtext'
import SaveToFolder from './SaveToFolder'

export default function QuestionNotes({ questionId }) {
  const user = useUser()
  const [notes, setNotes] = useState([])
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const [confirmId, setConfirmId] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [dialog, setDialog] = useState(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [contentDraft, setContentDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [sorting, setSorting] = useState(false)
  const [order, setOrder] = useState([])
  const [dragId, setDragId] = useState('')
  const [toast, setToast] = useState('')
  const [saveNote, setSaveNote] = useState(null)
  const inputRef = useRef(null)
  const holdRef = useRef(null)
  const startRef = useRef({ x: 0, y: 0 })
  const orderRef = useRef([])

  async function load() {
    if (!user) {
      setNotes([])
      return
    }
    try {
      const r = await fetch(`/api/notes?questionId=${encodeURIComponent(questionId)}`, { credentials: 'same-origin' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || '加载笔记失败')
      setNotes(d.notes || [])
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [questionId, user?.id])

  useEffect(() => {
    setOrder(notes)
    orderRef.current = notes
  }, [notes])

  useEffect(() => {
    document.body.classList.toggle('note-dragging', !!dragId)
    return () => document.body.classList.remove('note-dragging')
  }, [dragId])

  function onDown(e, id) {
    if (!sorting) return
    startRef.current = { x: e.clientX, y: e.clientY }
    clearTimeout(holdRef.current)
    holdRef.current = setTimeout(() => {
      setDragId(id)
      if (navigator.vibrate) navigator.vibrate(12)
    }, 380)
  }

  function onMove(e) {
    if (!sorting) return
    if (holdRef.current) {
      const d = Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y)
      if (d > 8) {
        clearTimeout(holdRef.current)
        holdRef.current = null
      }
    }
    if (!dragId) return
    const cards = [...document.querySelectorAll('[data-note-id]')]
    let target = cards.length - 1
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) {
        target = i
        break
      }
    }
    setOrder((prev) => {
      const from = prev.findIndex((x) => x.id === dragId)
      if (from === -1 || from === target) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(target, 0, item)
      orderRef.current = next
      return next
    })
  }

  async function onUp() {
    if (holdRef.current) {
      clearTimeout(holdRef.current)
      holdRef.current = null
    }
    if (!dragId) return
    setDragId('')
    const ids = orderRef.current.map((n) => n.id)
    try {
      const r = await fetch('/api/notes/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ids }),
      })
      if (!r.ok) throw new Error('保存顺序失败')
      setToast('顺序已保存')
      setTimeout(() => setToast(''), 1600)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    setOrder(notes)
    orderRef.current = notes
  }, [notes])

  useEffect(() => {
    document.body.classList.toggle('note-dragging', !!dragId)
    return () => document.body.classList.remove('note-dragging')
  }, [dragId])

  function onDown(e, id) {
    if (!sorting) return
    startRef.current = { x: e.clientX, y: e.clientY }
    clearTimeout(holdRef.current)
    holdRef.current = setTimeout(() => {
      setDragId(id)
      if (navigator.vibrate) navigator.vibrate(12)
    }, 380)
  }

  function onMove(e) {
    if (!sorting) return
    if (holdRef.current) {
      const d = Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y)
      if (d > 8) {
        clearTimeout(holdRef.current)
        holdRef.current = null
      }
    }
    if (!dragId) return
    const cards = [...document.querySelectorAll('[data-note-id]')]
    let target = cards.length - 1
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) {
        target = i
        break
      }
    }
    setOrder((prev) => {
      const from = prev.findIndex((x) => x.id === dragId)
      if (from === -1 || from === target) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(target, 0, item)
      orderRef.current = next
      return next
    })
  }

  async function onUp() {
    if (holdRef.current) {
      clearTimeout(holdRef.current)
      holdRef.current = null
    }
    if (!dragId) return
    setDragId('')
    const ids = orderRef.current.map((n) => n.id)
    try {
      const r = await fetch('/api/notes/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ids }),
      })
      if (!r.ok) throw new Error('保存顺序失败')
      setToast('顺序已保存')
      setTimeout(() => setToast(''), 1600)
    } catch (e) {
      setError(e.message)
    }
  }

  function onPick(e) {
    const files = [...(e.target.files || [])].filter((f) => /^image\//.test(f.type))
    e.target.value = ''
    if (!files.length || !user) return
    setPending(files)
  }

  function openNew() {
    setDialog({ mode: 'new' })
    setTitleDraft('')
    setContentDraft('')
  }

  function openEdit(n) {
    setDialog({ mode: 'edit', note: n })
    setTitleDraft(n.title || '')
    setContentDraft(n.content || '')
  }

  function toggle(id) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function saveDialog() {
    if (!dialog) return
    const content = contentDraft.trim()
    const title = titleDraft.trim()
    if (!content) return
    setSaving(true)
    setError('')
    try {
      const isEdit = dialog.mode === 'edit'
      const url = isEdit ? `/api/notes/${dialog.note.id}` : '/api/notes'
      const payload = isEdit ? { title, content } : { kind: 'text', questionId, title, content }
      const r = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || '保存失败')
      if (!isEdit && d.id) {
        setCollapsed((prev) => {
          const next = new Set(prev)
          next.delete(d.id)
          return next
        })
      }
      setDialog(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      await load()
    } catch {
      setError('删除失败，请重试')
    }
  }

  const target = notes.find((n) => n.id === confirmId)

  return (
    <div className="q-notes">
      <div className="notes-head">
        <div className="label">我的笔记 · {user ? `${user.name} · ${notes.length} 条` : '未选择账号'}</div>
        {user && (
          <div className="notes-tools">
            <button className="btn sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              <ImagePlus size={14} /> 截图
            </button>
            <button className="btn sm" onClick={openNew}>
              <FileText size={14} /> 文字
            </button>
            {notes.length > 1 && (
              <button className={`btn sm ${sorting ? 'on' : ''}`} onClick={() => setSorting((v) => !v)}>
                <ListOrdered size={14} /> {sorting ? '完成' : '排序'}
              </button>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
      </div>

      {error && <div className="notes-error">{error}</div>}

      {!user && <div className="small muted">请先在右上角选择账号（杨玉秀 / 李泽枫），笔记会保存到云端并随账号切换。</div>}

      {user && notes.length === 0 && (
        <div className="small muted">还没有笔记。可以上传截图，或粘贴一段带公式的文字。</div>
      )}

      {toast && <div className="notes-toast">{toast}</div>}

      {user && notes.length > 0 && (
        <div className={`notes-stack ${sorting ? 'sorting' : ''}`}>
          {(sorting ? order : notes).map((n) => (
            <div
              key={n.id}
              data-note-id={n.id}
              className={`note-row ${sorting ? 'sortable' : ''} ${dragId === n.id ? 'dragging' : ''}`}
              onPointerDown={(e) => onDown(e, n.id)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {sorting && (
                <span className="note-grip" aria-hidden>
                  <GripVertical size={16} />
                </span>
              )}
              {n.kind === 'text' ? (
              <div className={`note-text-card ${collapsed.has(n.id) ? 'collapsed' : 'open'}`} key={n.id}>
                <div className="note-text-head" onClick={() => !sorting && toggle(n.id)} role="button" tabIndex={0}>
                  <span className="note-text-title">{n.title || '未命名笔记'}</span>
                  <ChevronDown size={15} className="note-text-arrow" />
                  <div className="note-text-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="note-icon-btn" onClick={() => setSaveNote(n)} title="保存到积累" aria-label="保存到积累">
                      <FolderPlus size={14} />
                    </button>
                    <button className="note-icon-btn" onClick={() => openEdit(n)} title="编辑" aria-label="编辑">
                      <Pencil size={14} />
                    </button>
                    <button className="note-icon-btn" onClick={() => setConfirmId(n.id)} title="删除" aria-label="删除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {!collapsed.has(n.id) && (
                  <div className="note-text-body">
                    <div className="rt" dangerouslySetInnerHTML={{ __html: renderRichText(n.content) }} />
                  </div>
                )}
              </div>
            ) : (
              <div className="note-img-card" key={n.id}>
                <img src={n.url} alt="笔记截图" loading="lazy" onClick={() => setPreview(n.url)} />
                <span className="note-zoom" onClick={() => setPreview(n.url)} aria-hidden>
                  <Maximize2 size={12} />
                </span>
                <button className="note-save" onClick={() => setSaveNote(n)} title="保存到积累" aria-label="保存到积累">
                  <FolderPlus size={13} />
                </button>
                <button className="note-del" onClick={() => setConfirmId(n.id)} aria-label="删除">
                  <Trash2 size={13} />
                </button>
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <div className="confirm-mask" onClick={() => setDialog(null)}>
          <div className="confirm-box note-text-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="confirm-title" style={{ margin: 0 }}>
                {dialog.mode === 'edit' ? '编辑笔记' : '添加文字笔记'}
              </div>
              <button
                className="btn ghost sm"
                onClick={() => setDialog(null)}
                aria-label="关闭"
                style={{ width: 28, height: 28, padding: 0 }}
              >
                <X size={15} />
              </button>
            </div>
            <div className="small muted" style={{ margin: '6px 0 2px' }}>
              支持直接粘贴，<code>$...$</code> 和 <code>\frac</code> 这类裸公式都会自动渲染。
            </div>
            <input
              className="input"
              placeholder="笔记名称（可选，显示为标题）"
              value={titleDraft}
              maxLength={60}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
            <textarea
              className="input note-textarea"
              rows={12}
              value={contentDraft}
              onChange={(e) => setContentDraft(e.target.value)}
              placeholder={'例：\n第一步：确认 P、Q\n\\frac{\\partial u}{\\partial x}=P\n2. 对 x 偏积分，补 \\phi(y)'}
            />
            <div className="confirm-actions">
              <button className="btn sm" onClick={() => setDialog(null)}>
                取消
              </button>
              <button className="btn sm primary" onClick={saveDialog} disabled={saving || !contentDraft.trim()}>
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId && (
        <div className="confirm-mask" onClick={() => setConfirmId('')}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">{target?.kind === 'text' ? '删除这条文字笔记？' : '删除这张截图？'}</div>
            <div className="confirm-text">删除后无法恢复，云端记录也会同步移除。</div>
            <div className="confirm-actions">
              <button className="btn sm" onClick={() => setConfirmId('')}>
                取消
              </button>
              <button
                className="btn sm danger"
                onClick={async () => {
                  const id = confirmId
                  setConfirmId('')
                  await remove(id)
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <NoteUploader
          files={pending}
          questionId={questionId}
          onDone={() => {
            setPending(null)
            load()
          }}
          onCancel={() => setPending(null)}
        />
      )}

      {saveNote && (
        <SaveToFolder
          note={saveNote}
          onClose={() => setSaveNote(null)}
          onSaved={() => {
            setToast('已保存到积累')
            setTimeout(() => setToast(''), 1800)
          }}
        />
      )}

      {preview && <ImageViewer src={preview} onClose={() => setPreview('')} />}
    </div>
  )
}
