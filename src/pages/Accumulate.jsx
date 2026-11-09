import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  ImagePlus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { useUser } from '../lib/auth'

async function compressImage(file, maxW = 1200, quality = 0.72) {
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

function FolderNode({ node, level, currentId, expanded, onToggle, onSelect }) {
  const hasKids = node.children.length > 0
  const open = expanded.has(node.id)
  return (
    <div>
      <div className={`fold-row ${currentId === node.id ? 'active' : ''}`} style={{ paddingLeft: 6 + level * 14 }}>
        <button
          className={`fold-toggle ${hasKids ? '' : 'blank'}`}
          onClick={() => hasKids && onToggle(node.id)}
          aria-label={open ? '收起' : '展开'}
        >
          {hasKids ? <ChevronRight size={13} className={open ? 'rot' : ''} /> : null}
        </button>
        <button className="fold-name" onClick={() => onSelect(node.id)} title={node.name}>
          {currentId === node.id ? <FolderOpen size={14} /> : <Folder size={14} />}
          <span>{node.name}</span>
        </button>
        {node.count > 0 && <span className="fold-count">{node.count}</span>}
      </div>
      {hasKids && open && (
        <div>
          {node.children.map((c) => (
            <FolderNode
              key={c.id}
              node={c}
              level={level + 1}
              currentId={currentId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Accumulate() {
  const user = useUser()
  const [folders, setFolders] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [items, setItems] = useState([])
  const [expanded, setExpanded] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null)
  const [preview, setPreview] = useState('')
  const inputRef = useRef(null)

  const tree = useMemo(() => {
    const map = new Map()
    for (const f of folders) map.set(f.id, { ...f, children: [] })
    const roots = []
    for (const f of map.values()) {
      if (f.parentId && map.has(f.parentId)) map.get(f.parentId).children.push(f)
      else roots.push(f)
    }
    return roots
  }, [folders])

  const current = folders.find((f) => f.id === currentId) || null
  const children = useMemo(
    () => (current ? folders.filter((f) => f.parentId === current.id) : []),
    [folders, current],
  )

  const path = useMemo(() => {
    const list = []
    let node = current
    const byId = new Map(folders.map((f) => [f.id, f]))
    let guard = 0
    while (node && guard++ < 50) {
      list.unshift(node)
      node = node.parentId ? byId.get(node.parentId) : null
    }
    return list
  }, [current, folders])

  async function loadFolders() {
    if (!user) return
    try {
      const r = await fetch('/api/folders', { credentials: 'same-origin' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || '加载失败')
      setFolders(d.folders || [])
    } catch (e) {
      setError(e.message)
    }
  }

  async function loadItems(fid) {
    if (!user || !fid) {
      setItems([])
      return
    }
    try {
      const r = await fetch(`/api/folders/${fid}/items`, { credentials: 'same-origin' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || '加载失败')
      setItems(d.items || [])
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    loadFolders()
  }, [user?.id])

  useEffect(() => {
    loadItems(currentId)
  }, [currentId, user?.id])

  function selectFolder(id) {
    setCurrentId(id)
    setError('')
  }

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function createFolder(name, parentId) {
    const r = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name, parentId }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || '创建失败')
    await loadFolders()
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId))
    setCurrentId(d.id)
  }

  async function renameFolder(id, name) {
    const r = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || '重命名失败')
    await loadFolders()
  }

  async function deleteFolder(id) {
    const r = await fetch(`/api/folders/${id}`, { method: 'DELETE', credentials: 'same-origin' })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || '删除失败')
    if (currentId === id || path.some((p) => p.id === id)) setCurrentId(null)
    await loadFolders()
  }

  async function addText(fid, text) {
    const r = await fetch(`/api/folders/${fid}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ kind: 'text', text }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || '保存失败')
    await loadItems(fid)
    await loadFolders()
  }

  async function onPickImage(e) {
    const files = [...(e.target.files || [])].filter((f) => /^image\//.test(f.type))
    e.target.value = ''
    if (!files.length || !currentId) return
    setBusy(true)
    setError('')
    try {
      for (const f of files) {
        const blob = await compressImage(f)
        const base64 = await blobToBase64(blob)
        const r = await fetch(`/api/folders/${currentId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ kind: 'image', mime: 'image/jpeg', data: base64 }),
        })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || '上传失败')
      }
      await loadItems(currentId)
      await loadFolders()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteItem(id) {
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      await loadItems(currentId)
      await loadFolders()
    } catch {
      setError('删除失败，请重试')
    }
  }

  function submitDialog(value) {
    if (!dialog) return
    const v = String(value || '').trim()
    if (!v) return
    setBusy(true)
    const run = async () => {
      try {
        if (dialog.type === 'new') await createFolder(v, dialog.parentId)
        if (dialog.type === 'rename') await renameFolder(dialog.id, v)
        if (dialog.type === 'text') await addText(dialog.id, v)
        setDialog(null)
      } catch (e) {
        setError(e.message)
      } finally {
        setBusy(false)
      }
    }
    run()
  }

  if (!user) {
    return (
      <div className="shell" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div className="empty">
          <div className="big">请先选择账号</div>
          <div className="small">积累内容按账号保存，右上角选择「杨玉秀」或「李泽枫」后使用。</div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell acc-shell">
      <aside className="sidebar acc-sidebar">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">文件夹</div>
            <span className="tiny muted">{folders.length} 个</span>
          </div>
          <div className="panel-body">
            <div className="acc-tree">
              <button className={`fold-row root ${currentId === null ? 'active' : ''}`} onClick={() => selectFolder(null)}>
                <span className="fold-toggle blank" />
                <span className="fold-name">
                  <FolderOpen size={14} />
                  <span>全部积累</span>
                </span>
              </button>
              {tree.map((node) => (
                <FolderNode
                  key={node.id}
                  node={node}
                  level={0}
                  currentId={currentId}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onSelect={selectFolder}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="main acc-main">
        <div className="acc-hero">
          <div className="eyebrow">ACCUMULATE · 积累</div>
          <h1 className="serif">把值得留下的东西，分门别类存起来</h1>
          <p className="muted">支持无限层级文件夹，每个文件夹都可上传照片、写文字。</p>
        </div>

        <div className="acc-mobile-bar">
          <select
            className="select"
            value={currentId || ''}
            onChange={(e) => selectFolder(e.target.value || null)}
            aria-label="选择文件夹"
          >
            <option value="">全部积累</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {'　'.repeat(0)}
                {pathLabel(f, folders)}
              </option>
            ))}
          </select>
        </div>

        <div className="acc-toolbar">
          <div className="acc-crumbs">
            <button className="crumb" onClick={() => selectFolder(null)}>
              全部
            </button>
            {path.map((p) => (
              <button key={p.id} className="crumb" onClick={() => selectFolder(p.id)}>
                <ChevronRight size={12} />
                {p.name}
              </button>
            ))}
          </div>

          <div className="acc-actions">
            <button className="btn sm" onClick={() => setDialog({ type: 'new', parentId: currentId })} disabled={busy}>
              <FolderPlus size={15} /> 新建
            </button>
            {current && (
              <>
                <button className="btn sm" onClick={() => setDialog({ type: 'rename', id: current.id, value: current.name })} disabled={busy}>
                  <Pencil size={15} /> 重命名
                </button>
                <button className="btn sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                  <ImagePlus size={15} /> {busy ? '上传中…' : '照片'}
                </button>
                <button className="btn sm" onClick={() => setDialog({ type: 'text', id: current.id })} disabled={busy}>
                  <FileText size={15} /> 文字
                </button>
                <button className="btn sm danger-ghost" onClick={() => setDialog({ type: 'delete', id: current.id })} disabled={busy}>
                  <Trash2 size={15} /> 删除
                </button>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPickImage} />
          </div>
        </div>

        {error && <div className="notes-error">{error}</div>}

        {!current && (
          <>
            <div className="acc-section-title">顶层文件夹</div>
            {tree.length === 0 ? (
              <div className="empty">
                <div className="big">还没有文件夹</div>
                <div className="small">点右上角「新建」，建立第一个文件夹。</div>
              </div>
            ) : (
              <div className="acc-grid">
                {tree.map((f) => (
                  <button key={f.id} className="acc-folder" onClick={() => selectFolder(f.id)}>
                    <Folder size={20} />
                    <span>{f.name}</span>
                    <em>{f.count} 项</em>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {current && (
          <>
            <div className="acc-section-title">子文件夹</div>
            {children.length > 0 ? (
              <div className="acc-grid">
                {children.map((f) => (
                  <button key={f.id} className="acc-folder" onClick={() => selectFolder(f.id)}>
                    <Folder size={20} />
                    <span>{f.name}</span>
                    <em>{f.count} 项</em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="tiny muted" style={{ marginTop: 4 }}>
                还没有子文件夹，点上方「新建」可以在这里创建。
              </div>
            )}

            <div className="acc-section-title">内容 · {items.length} 项</div>
            {items.length === 0 ? (
              <div className="empty">
                <div className="big">这个文件夹还是空的</div>
                <div className="small">可以上传照片，或添加一段文字。</div>
              </div>
            ) : (
              <div className="acc-items">
                {items.map((it) =>
                  it.kind === 'image' ? (
                    <div key={it.id} className="acc-item img">
                      <img src={it.url} alt="照片" loading="lazy" onClick={() => setPreview(it.url)} />
                      <button className="acc-del" onClick={() => setDialog({ type: 'itemDelete', id: it.id })} aria-label="删除">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <div key={it.id} className="acc-item text">
                      <div className="acc-text">{it.text}</div>
                      <button className="acc-del" onClick={() => setDialog({ type: 'itemDelete', id: it.id })} aria-label="删除">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
          </>
        )}

        {dialog && (
          <div className="confirm-mask" onClick={() => setDialog(null)}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              {dialog.type === 'new' && (
                <>
                  <div className="confirm-title">{dialog.parentId ? '新建子文件夹' : '新建文件夹'}</div>
                  <input
                    className="input"
                    autoFocus
                    placeholder="名称，例如「第一章 极限」"
                    defaultValue=""
                    id="acc-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitDialog(e.currentTarget.value)
                    }}
                  />
                  <div className="confirm-actions">
                    <button className="btn sm" onClick={() => setDialog(null)}>取消</button>
                    <button className="btn sm primary" onClick={() => submitDialog(document.getElementById('acc-input')?.value)} disabled={busy}>
                      创建
                    </button>
                  </div>
                </>
              )}
              {dialog.type === 'rename' && (
                <>
                  <div className="confirm-title">重命名文件夹</div>
                  <input className="input" autoFocus defaultValue={dialog.value} id="acc-input" onKeyDown={(e) => { if (e.key === 'Enter') submitDialog(e.currentTarget.value) }} />
                  <div className="confirm-actions">
                    <button className="btn sm" onClick={() => setDialog(null)}>取消</button>
                    <button className="btn sm primary" onClick={() => submitDialog(document.getElementById('acc-input')?.value)} disabled={busy}>
                      保存
                    </button>
                  </div>
                </>
              )}
              {dialog.type === 'text' && (
                <>
                  <div className="confirm-title">添加文字</div>
                  <textarea className="input acc-textarea" autoFocus rows={6} id="acc-input" placeholder="写点什么…" />
                  <div className="confirm-actions">
                    <button className="btn sm" onClick={() => setDialog(null)}>取消</button>
                    <button className="btn sm primary" onClick={() => submitDialog(document.getElementById('acc-input')?.value)} disabled={busy}>
                      保存
                    </button>
                  </div>
                </>
              )}
              {dialog.type === 'delete' && (
                <>
                  <div className="confirm-title">删除文件夹？</div>
                  <div className="confirm-text">会连同所有子文件夹和内容一起删除，无法恢复。</div>
                  <div className="confirm-actions">
                    <button className="btn sm" onClick={() => setDialog(null)}>取消</button>
                    <button
                      className="btn sm danger"
                      onClick={async () => {
                        const id = dialog.id
                        setDialog(null)
                        setBusy(true)
                        try {
                          await deleteFolder(id)
                        } catch (e) {
                          setError(e.message)
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
              {dialog.type === 'itemDelete' && (
                <>
                  <div className="confirm-title">删除这项内容？</div>
                  <div className="confirm-text">删除后无法恢复。</div>
                  <div className="confirm-actions">
                    <button className="btn sm" onClick={() => setDialog(null)}>取消</button>
                    <button
                      className="btn sm danger"
                      onClick={async () => {
                        const id = dialog.id
                        setDialog(null)
                        await deleteItem(id)
                      }}
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {preview && (
          <div className="note-preview" onClick={() => setPreview('')}>
            <img src={preview} alt="预览" />
            <button className="note-close" onClick={() => setPreview('')} aria-label="关闭">
              <X size={18} />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function pathLabel(folder, all) {
  const byId = new Map(all.map((f) => [f.id, f]))
  const parts = []
  let node = folder
  let guard = 0
  while (node && guard++ < 50) {
    parts.unshift(node.name)
    node = node.parentId ? byId.get(node.parentId) : null
  }
  return parts.join(' / ')
}
