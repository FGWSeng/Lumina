import { useEffect, useRef, useState } from 'react'
import { Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'

const MIN = 0.5
const MAX = 5

export default function ImageViewer({ src, alt = '', onClose }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(null)
  const pointers = useRef(new Map())
  const pinchRef = useRef(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') zoomBy(0.25)
      if (e.key === '-') zoomBy(-0.25)
      if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function zoomBy(delta) {
    setScale((s) => {
      const next = Math.min(MAX, Math.max(MIN, +(s + delta).toFixed(2)))
      if (next === 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }

  function reset() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  function onWheel(e) {
    e.preventDefault()
    zoomBy(e.deltaY > 0 ? -0.2 : 0.2)
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
      setDragging(true)
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale }
      dragRef.current = null
    }
  }

  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const next = Math.min(MAX, Math.max(MIN, pinchRef.current.scale * (dist / pinchRef.current.dist)))
      setScale(+next.toFixed(2))
    } else if (dragRef.current) {
      setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y })
    }
  }

  function onPointerUp(e) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) {
      dragRef.current = null
      setDragging(false)
    }
    if (pointers.current.size < 2) pinchRef.current = null
  }

  return (
    <div className="image-viewer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={dragging ? 'dragging' : ''}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => (scale === 1 ? setScale(2) : reset())}
      />

      <button className="viewer-close" onClick={onClose} aria-label="关闭">
        <X size={20} />
      </button>

      <div className="viewer-toolbar" onClick={(e) => e.stopPropagation()}>
        <button className="viewer-btn" onClick={() => zoomBy(-0.3)} aria-label="缩小">
          <ZoomOut size={17} />
        </button>
        <span className="viewer-scale">{Math.round(scale * 100)}%</span>
        <button className="viewer-btn" onClick={() => zoomBy(0.3)} aria-label="放大">
          <ZoomIn size={17} />
        </button>
        <button className="viewer-btn" onClick={reset} aria-label="重置">
          <RotateCcw size={16} />
        </button>
        <button className="viewer-btn" onClick={() => setScale(MAX)} aria-label="最大化">
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="viewer-hint">滚轮 / 双指缩放 · 拖动平移 · 双击切换 · Esc 关闭</div>
    </div>
  )
}
