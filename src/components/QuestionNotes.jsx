import { useEffect, useRef, useState } from 'react'
import { FileText, ImagePlus, Maximize2, Trash2, X } from 'lucide-react'
import ImageViewer from './ImageViewer'
import NoteUploader from './NoteUploader'
import { useUser } from '../lib/auth'
import { renderRichText } from '../lib/richtext'

export default function QuestionNotes({ questionId }) {
  const user = useUser()
  const [notes, setNotes] = useState([])
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const [confirmId, setConfirmId] = useState('')
  const [textOpen, setTextOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

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

  function onPick(e) {
    const files = [...(e.target.files || [])].filter((f) => /^image\//.test(f.type))
    e.target.value = ''
    if (!files.length || !user) return
    setPending(files)
  }

  async function saveText() {
    const content = draft.trim()
    if (!content) return
    setSaving(true)
    setError('')
    try {
      const r = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ kind: 'text', questionId, content }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || '保存失败')
      setTextOpen(false)
      setDraft('')
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
            <button className="btn sm" onClick={() => setTextOpen(true)}>
              <FileText size={14} /> 文字
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
      </div>

      {error && <div className="notes-error">{error}</div>}

      {!user && <div className="small muted">请先在右上角选择账号（杨玉秀 / 李泽枫），笔记会保存到云端并随账号切换。</div>}

      {user && notes.length === 0 && (
        <div className="small muted">还没有笔记。可以上传截图，或粘贴一段带公式的文字。</div>
      )}

      {user && notes.length > 0 && (
        <div className="notes-stack">
          {notes.map((n) =>
            n.kind === 'text' ? (
              <div className="note-text-card" key={n.id}>
                <div className="rt" dangerouslySetInnerHTML={{ __html: renderRichText(n.content) }} />
                <button className="note-del" onClick={() => setConfirmId(n.id)} aria-label="删除">
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <div className="note-img-card" key={n.id}>
                <img src={n.url} alt="笔记截图" loading="lazy" onClick={() => setPreview(n.url)} />
                <span className="note-zoom" onClick={() => setPreview(n.url)} aria-hidden>
                  <Maximize2 size={12} />
                </span>
                <button className="note-del" onClick={() => setConfirmId(n.id)} aria-label="删除">
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {textOpen && (
        <div className="confirm-mask" onClick={() => setTextOpen(false)}>
          <div className="confirm-box note-text-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="confirm-title" style={{ margin: 0 }}>
                添加文字笔记
              </div>
              <button className="btn ghost sm" onClick={() => setTextOpen(false)} aria-label="关闭" style={{ width: 28, height: 28, padding: 0 }}>
                <X size={15} />
              </button>
            </div>
            <div className="small muted" style={{ margin: '6px 0 4px' }}>
              直接粘贴即可：分段、编号、<code>$...$</code> 和 <code>\frac</code> 这类裸公式都会自动渲染成 KaTeX。
            </div>
            <textarea
              className="input note-textarea"
              rows={12}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={'例：\n第一步：确认 P、Q\n\\frac{\\partial u}{\\partial x}=P\n2. 对 x 偏积分，补 \\phi(y)'}
            />
            <div className="confirm-actions">
              <button className="btn sm" onClick={() => setTextOpen(false)}>
                取消
              </button>
              <button className="btn sm primary" onClick={saveText} disabled={saving || !draft.trim()}>
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

      {preview && <ImageViewer src={preview} onClose={() => setPreview('')} />}
    </div>
  )
}
