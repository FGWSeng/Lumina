import { useEffect, useMemo, useState } from 'react'
import { Check, Folder, FolderPlus, X } from 'lucide-react'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '')
    fr.onerror = reject
    fr.readAsDataURL(blob)
  })
}

export default function SaveToFolder({ note, onClose, onSaved }) {
  const [folders, setFolders] = useState([])
  const [selected, setSelected] = useState('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/folders', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setFolders(d.folders || []))
      .catch(() => {})
  }, [])

  const tree = useMemo(() => {
    const map = new Map(folders.map((f) => [f.id, { ...f, children: [] }]))
    const roots = []
    for (const f of map.values()) {
      if (f.parentId && map.has(f.parentId)) map.get(f.parentId).children.push(f)
      else roots.push(f)
    }
    const out = []
    const walk = (nodes, depth) => {
      for (const n of nodes) {
        out.push({ ...n, depth })
        walk(n.children, depth + 1)
      }
    }
    walk(roots, 0)
    return out
  }, [folders])

  async function pushItem(folderId) {
    if (note.kind === 'text') {
      const text = note.title ? `${note.title}\n\n${note.content}` : note.content
      const r = await fetch(`/api/folders/${folderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ kind: 'text', text, title: note.title || '', questionId: note.questionId || '' }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || '保存失败')
      return
    }
    const res = await fetch(note.url, { credentials: 'same-origin' })
    if (!res.ok) throw new Error('读取图片失败')
    const blob = await res.blob()
    const data = await blobToBase64(blob)
    const r = await fetch(`/api/folders/${folderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ kind: 'image', mime: blob.type || 'image/jpeg', data, title: note.title || '', questionId: note.questionId || '' }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || '保存失败')
  }

  async function save() {
    if (!selected) {
      setError('请先选择一个文件夹')
      return
    }
    setBusy(true)
    setError('')
    try {
      await pushItem(selected)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function createAndSave() {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, parentId: selected || null }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || '新建失败')
      await pushItem(d.id)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="confirm-mask" onClick={onClose}>
      <div className="confirm-box save-folder-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="confirm-title" style={{ margin: 0 }}>
            保存到积累
          </div>
          <button className="btn ghost sm" onClick={onClose} aria-label="关闭" style={{ width: 28, height: 28, padding: 0 }}>
            <X size={15} />
          </button>
        </div>

        <div className="save-folder-new">
          <input
            className="input"
            style={{ marginTop: 0 }}
            placeholder={selected ? '在选中文件夹下新建' : '新建顶层文件夹'}
            value={newName}
            maxLength={40}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createAndSave()}
          />
          <button className="btn sm" onClick={createAndSave} disabled={busy || !newName.trim()}>
            <FolderPlus size={14} /> 新建并保存
          </button>
        </div>

        {error && <div className="notes-error">{error}</div>}

        <div className="save-folder-list">
          {tree.length === 0 && <div className="small muted" style={{ padding: '10px 4px' }}>还没有文件夹，输入名称新建一个。</div>}
          {tree.map((f) => (
            <button
              key={f.id}
              className={`save-folder-item ${selected === f.id ? 'active' : ''}`}
              style={{ paddingLeft: 10 + f.depth * 16 }}
              onClick={() => setSelected(f.id)}
            >
              <Folder size={14} />
              <span>{f.name}</span>
              {selected === f.id && <Check size={14} className="save-folder-check" />}
            </button>
          ))}
        </div>

        <div className="confirm-actions">
          <button className="btn sm" onClick={onClose}>
            取消
          </button>
          <button className="btn sm primary" onClick={save} disabled={busy || !selected}>
            {busy ? '保存中…' : '保存到这里'}
          </button>
        </div>
      </div>
    </div>
  )
}
