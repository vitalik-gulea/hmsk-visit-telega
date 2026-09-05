import { useRef, useState, type PointerEvent } from 'react'

const SWIPE_THRESHOLD = 100
const FLY_OUT_DISTANCE = 600

interface SwipeCardProps {
  name: string
  onSwipe: (direction: 'left' | 'right') => void
}

export function SwipeCard({ name, onSwipe }: SwipeCardProps) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  const startX = useRef(0)

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (exiting) return
    setDragging(true)
    startX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    setDragX(e.clientX - startX.current)
  }

  function finishDrag() {
    if (!dragging) return
    setDragging(false)

    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      const direction = dragX > 0 ? 'right' : 'left'
      setExiting(direction)
      setTimeout(() => onSwipe(direction), 200)
    } else {
      setDragX(0)
    }
  }

  const translateX = exiting ? (exiting === 'right' ? FLY_OUT_DISTANCE : -FLY_OUT_DISTANCE) : dragX
  const rotate = translateX / 20

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      className="relative flex h-52 w-full touch-none items-center justify-center rounded-3xl bg-surface p-6 text-center shadow-field select-none"
      style={{
        transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
        transition: dragging ? 'none' : 'transform 250ms ease-out, opacity 250ms ease-out',
        opacity: exiting ? 0 : 1,
        cursor: 'grab',
      }}
    >
      <span className="text-xl font-semibold">{name}</span>

      <div
        className="pointer-events-none absolute top-4 left-4 rounded-full border-2 border-danger px-3 py-1 text-sm font-bold text-danger"
        style={{ opacity: Math.max(0, Math.min(1, -translateX / 80)) }}
      >
        НЕ БЫЛ
      </div>
      <div
        className="pointer-events-none absolute top-4 right-4 rounded-full border-2 border-success px-3 py-1 text-sm font-bold text-success"
        style={{ opacity: Math.max(0, Math.min(1, translateX / 80)) }}
      >
        БЫЛ
      </div>
    </div>
  )
}
