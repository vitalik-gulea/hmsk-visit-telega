import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@heroui/react'
import { useSelectedGroup } from '../context/selected-group'
import { fetchRoster, saveAttendance, type RosterEntry } from '../lib/roster'

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

  function handleDecision(present: boolean) {
    if (!roster) return
    const entry = roster[currentIndex]
    setDecisions((prev) => [{ row: entry.row, name: entry.name, present }, ...prev])
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
          <div className="flex h-52 w-full items-center justify-center rounded-3xl bg-surface p-6 text-center shadow-field">
            <span className="text-xl font-semibold">{roster[currentIndex].name}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 border-2 border-danger text-danger" onPress={() => handleDecision(false)}>
              Не был
            </Button>
            <Button variant="ghost" className="flex-1 border-2 border-success text-success" onPress={() => handleDecision(true)}>
              Был
            </Button>
          </div>
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
