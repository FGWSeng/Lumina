import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Maximize2, Trash2 } from 'lucide-react'
import ImageViewer from './ImageViewer'
import NoteUploader from './NoteUploader'
import { useUser } from '../lib/auth'

async function compress(file, maxW = 1200, quality = 0.72) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxW / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob || file
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '')
    fr.onerror = reject
    fr.readAsDataURL(blob)
  })
}

export default function QuestionNotes({ questionId }) {
  const user = useUser()
  const [notes, setNotes] = useState([])
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
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

  async function remove(id) {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      await load()
    } catch {
      setError('删除失败，请重试')
    }
  }

  return (
    <div className="q-notes">
      <div className="notes-head">
        <div className="label">我的笔记 · {user ? `${user.name} · ${notes.length} 张` : '未选择账号'}</div>
        {user && (
          <button className="btn sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <ImagePlus size={14} /> {busy ? '处理中…' : '上传截图'}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
      </div>

      {error && <div className="notes-error">{error}</div>}

      {!user && <div className="small muted">请先在右上角选择账号（杨玉秀 / 李泽枫），笔记会保存到云端并随账号切换。</div>}

      {user && notes.length === 0 && (
        <div className="small muted">这个账号还没有截图。图片会保存到云端，换设备登录也能看到。</div>
      )}

      {user && notes.length > 0 && (
        <div className="notes-grid">
          {notes.map((n) => (
            <div className="note-item" key={n.id}>
              <img src={n.url} alt="笔记截图" loading="lazy" onClick={() => setPreview(n.url)} />
              <span className="note-zoom" onClick={() => setPreview(n.url)} aria-hidden>
                <Maximize2 size={12} />
              </span>
              <button className="note-del" onClick={() => remove(n.id)} aria-label="删除">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
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
