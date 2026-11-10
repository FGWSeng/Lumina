import { useEffect, useRef, useState } from 'react'
import { RotateCcw, RotateCw, X } from 'lucide-react'

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取这张图片，换一张试试'))
    }
    img.src = url
  })
}

function rotatedSize(w, h, angle) {
  return angle % 180 === 0 ? { w, h } : { w: h, h: w }
}

function drawPreview(canvas, img, angle) {
  const { w: cw, h: ch } = rotatedSize(img.naturalWidth, img.naturalHeight, angle)
  const maxW = Math.min(720, window.innerWidth - 32)
  const maxH = Math.min(window.innerHeight * 0.58, 560)
  const scale = Math.min(maxW / cw, maxH / ch, 1)
  canvas.width = Math.max(1, Math.round(cw * scale))
  canvas.height = Math.max(1, Math.round(ch * scale))
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((angle * Math.PI) / 180)
  ctx.drawImage(img, (-img.naturalWidth * scale) / 2, (-img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale)
  ctx.restore()
}

async function renderBlob(img, angle, maxEdge = 1200, quality = 0.72) {
  const { w: cw, h: ch } = rotatedSize(img.naturalWidth, img.naturalHeight, angle)
  const scale = Math.min(1, maxEdge / Math.max(cw, ch))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(cw * scale))
  canvas.height = Math.max(1, Math.round(ch * scale))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((angle * Math.PI) / 180)
  ctx.drawImage(img, (-img.naturalWidth * scale) / 2, (-img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale)
  ctx.restore()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('图片处理失败')
  return blob
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '')
    fr.onerror = reject
    fr.readAsDataURL(blob)
  })
}

export default function NoteUploader({ files, questionId, folderId, onDone, onCancel }) {
  const [idx, setIdx] = useState(0)
  const [img, setImg] = useState(null)
  const [angle, setAngle] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef(null)
  const urlRef = useRef('')

  useEffect(() => {
    let alive = true
    const f = files[idx]
    if (!f) return
    loadImage(f)
      .then(({ img, url }) => {
        if (!alive) {
          URL.revokeObjectURL(url)
          return
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = url
        setImg(img)
        setAngle(0)
        setError('')
      })
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [idx, files])

  useEffect(() => {
    if (img && canvasRef.current) drawPreview(canvasRef.current, img, angle)
  }, [img, angle])

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  function rotate(delta) {
    setAngle((a) => (a + delta + 360) % 360)
  }

  async function upload() {
    if (!img) return
    setBusy(true)
    setError('')
    try {
      const blob = await renderBlob(img, angle)
      const base64 = await blobToBase64(blob)
      const url = folderId ? `/api/folders/${folderId}/items` : '/api/notes'
      const payload = folderId
        ? { kind: 'image', mime: 'image/jpeg', data: base64 }
        : { questionId, mime: 'image/jpeg', data: base64 }
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || '上传失败')
      if (idx + 1 < files.length) {
        setIdx(idx + 1)
      } else {
        onDone()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="note-uploader">
      <div className="uploader-head">
        <span>
          调整方向
          {files.length > 1 ? ` · 第 ${idx + 1} / ${files.length} 张` : ''}
        </span>
        <button className="viewer-btn" onClick={onCancel} aria-label="取消">
          <X size={18} />
        </button>
      </div>

      <div className="uploader-stage">
        <canvas ref={canvasRef} />
      </div>

      {error && <div className="uploader-error">{error}</div>}

      <div className="uploader-angle">当前角度：{angle}°</div>

      <div className="uploader-actions">
        <button className="uploader-btn" onClick={() => rotate(-90)} disabled={busy}>
          <RotateCcw size={16} /> 左转 90°
        </button>
        <button className="uploader-btn" onClick={() => rotate(90)} disabled={busy}>
          <RotateCw size={16} /> 右转 90°
        </button>
        <button className="uploader-btn primary" onClick={upload} disabled={busy || !img}>
          {busy ? '上传中…' : '按此方向上传'}
        </button>
      </div>
    </div>
  )
}
