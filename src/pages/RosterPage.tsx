import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@heroui/react'
import { useSelectedGroup } from '../context/selected-group'
import { fetchRoster, saveAttendance, type RosterEntry } from '../lib/roster'
import { SwipeCard } from '../components/SwipeCard'

interface Decision {
  row: number
  name: string
  present: boolean
}

export function RosterPage() {
  const { selectedGroup, selectedDate } = useSelectedGroup()
  const [roster, setRoster] = useState<RosterEntry[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedGroup || !selectedDate) return
    let cancelled = false

    setRoster(null)
    setLoadError(null)
    setCurrentIndex(0)
    setDecisions([])
    setSaveState('idle')

    fetchRoster(selectedGroup, selectedDate)
      .then((result) => {
        if (!cancelled) setRoster(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [selectedGroup, selectedDate])

  if (!selectedGroup) return <Navigate to="/" replace />
  if (!selectedDate) return <Navigate to="/calendar" replace />

  const isDone = roster !== null && currentIndex >= roster.length

  function handleSwipe(direction: 'left' | 'right') {
    if (!roster) return
    const entry = roster[currentIndex]
    setDecisions((prev) => [{ row: entry.row, name: entry.name, present: direction === 'right' }, ...prev])
    setCurrentIndex((prev) => prev + 1)
  }

  function handleSave() {
    if (!selectedGroup || !selectedDate || saveState === 'saving') return
    setSaveState('saving')
    setSaveError(null)
    saveAttendance(
      selectedGroup,
      selectedDate,
      decisions.map(({ row, present }) => ({ row, present })),
    )
      .then(() => setSaveState('saved'))
      .catch((err: Error) => {
        setSaveState('error')
        setSaveError(err.message)
      })
  }

  if (loadError) {
    return <p className="text-danger">Не удалось загрузить список: {loadError}</p>
  }

  if (!roster) {
    return <p className="text-foreground/60">Загрузка...</p>
  }

  if (roster.length === 0) {
    return <p className="text-foreground/60">В этой группе никого нет.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {!isDone && (
        <>
          <p className="text-center text-sm text-foreground/60">
            {currentIndex + 1} из {roster.length}
          </p>
          <SwipeCard key={roster[currentIndex].row} name={roster[currentIndex].name} onSwipe={handleSwipe} />
          <p className="text-center text-xs text-foreground/50">
            Свайп вправо — был(а), влево — не был(а)
          </p>
        </>
      )}

      {isDone && saveState === 'idle' && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface px-4 py-4 text-center">
          <p className="font-semibold">Проверьте список и сохраните</p>
          <Button variant="primary" onPress={handleSave}>
            Сохранить
          </Button>
        </div>
      )}

      {isDone && saveState !== 'idle' && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-4 py-6 text-center">
          {saveState === 'saving' && <p>Сохраняю...</p>}
          {saveState === 'saved' && <p className="font-semibold text-success">Посещаемость сохранена ✓</p>}
          {saveState === 'error' && (
            <>
              <p className="text-danger">Не удалось сохранить: {saveError}</p>
              <Button variant="primary" onPress={handleSave}>
                Повторить
              </Button>
            </>
          )}
        </div>
      )}

      {decisions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {decisions.map((d) => (
            <li
              key={d.row}
              className="flex items-center justify-between rounded-2xl bg-surface px-3 py-2 text-sm"
            >
              <span>{d.name}</span>
              <span className={d.present ? 'font-semibold text-success' : 'font-semibold text-danger'}>
                {d.present ? '✓ был(а)' : '✗ не был(а)'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
