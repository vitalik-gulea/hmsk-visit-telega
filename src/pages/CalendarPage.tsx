import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@heroui/react'
import { useSelectedGroup } from '../context/selected-group'
import { fetchSchedule, type ScheduleEntry } from '../lib/schedule'

export function CalendarPage() {
  const { selectedGroup, setSelectedDate } = useSelectedGroup()
  const [schedule, setSchedule] = useState<ScheduleEntry[] | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = selectedGroup ? `${selectedGroup} — ХМСК Визит` : 'ХМСК Визит'
  }, [selectedGroup])

  useEffect(() => {
    if (!selectedGroup) return
    let cancelled = false

    setSchedule(null)
    setScheduleError(null)
    setSelectedIndex(null)

    fetchSchedule(selectedGroup)
      .then((result) => {
        if (!cancelled) setSchedule(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setScheduleError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [selectedGroup])

  if (!selectedGroup) {
    return <Navigate to="/" replace />
  }

  function handleConfirm() {
    if (selectedIndex === null || !schedule) return
    const entry = schedule[selectedIndex]
    setSelectedDate(entry.date, `${entry.date} · ${entry.day}`)
    navigate('/roster')
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Расписание группы</h1>

      {scheduleError && (
        <p className="text-danger">Не удалось загрузить расписание: {scheduleError}</p>
      )}

      {!scheduleError && !schedule && <p className="text-foreground/60">Загрузка...</p>}

      {schedule && schedule.length === 0 && (
        <p className="text-foreground/60">Тренировки для этой группы не найдены.</p>
      )}

      {schedule && schedule.length > 0 && (
        <ul className="flex flex-col gap-2">
          {schedule.map((entry, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={
                  'flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm transition-colors ' +
                  (selectedIndex === i
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-surface text-foreground')
                }
              >
                <span className="font-medium">
                  {entry.date} · {entry.day}
                </span>
                <span
                  className={
                    'text-right ' +
                    (selectedIndex === i ? 'text-accent-foreground/80' : 'text-foreground/70')
                  }
                >
                  {entry.time}
                  {entry.hall && (
                    <>
                      <br />
                      {entry.hall}
                    </>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {schedule && schedule.length > 0 && (
        <Button
          variant="primary"
          isDisabled={selectedIndex === null}
          onPress={handleConfirm}
          className="w-full"
        >
          Выбрать дату
        </Button>
      )}
    </div>
  )
}
