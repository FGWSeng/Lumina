import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { isPicked, togglePick } from '../lib/picks'

export default function PickButton({ questionId }) {
  const [picked, setPicked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tip, setTip] = useState('')

  useEffect(() => {
    let alive = true
    isPicked(questionId)
      .then((v) => alive && setPicked(v))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [questionId])

  async function onClick() {
    if (busy) return
    setBusy(true)
    try {
      const next = await togglePick(questionId)
      setPicked(next)
      setTip(next ? '已记入今日好题' : '已从今日好题移除')
    } catch (e) {
      setTip(e.message || '操作失败')
    } finally {
      setBusy(false)
      setTimeout(() => setTip(''), 1800)
    }
  }

  return (
    <span className="pick-wrap">
      <button className={`btn ${picked ? 'on' : ''}`} onClick={onClick} disabled={busy} title="记录到今日好题">
        <Star size={15} fill={picked ? 'currentColor' : 'none'} />
        {picked ? '已记录' : '好题'}
      </button>
      {tip && <span className="pick-tip">{tip}</span>}
    </span>
  )
}
