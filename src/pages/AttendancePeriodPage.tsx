import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSelectedGroup } from '../context/selected-group'
import { fetchAttendanceMonths, type AttendanceMonth } from '../lib/attendance'

export function AttendancePeriodPage() {
  const { selectedGroup, setSelectedPeriod } = useSelectedGroup()
  const [months, setMonths] = useState<AttendanceMonth[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!selectedGroup) return
    let cancelled = false

    setMonths(null)
    setError(null)

    fetchAttendanceMonths(selectedGroup)
      .then((result) => {
        if (!cancelled) setMonths(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [selectedGroup])

  if (!selectedGroup) {
    return <Navigate to="/" replace />
  }

  function handlePick(period: string, label: string) {
    setSelectedPeriod(period, label)
    navigate('/attendance/player')
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">За какой период?</h1>

      {error && <p className="text-danger">Не удалось загрузить расписание: {error}</p>}

      {!error && !months && <p className="text-foreground/60">Загрузка...</p>}

      {months && (
        <ul className="flex flex-col gap-2">
          <li>
            <button
              type="button"
              onClick={() => handlePick('all', 'За всё время')}
              className="w-full rounded-2xl bg-surface px-3 py-2 text-left text-sm font-semibold text-accent"
            >
              За всё время
            </button>
          </li>
          {months.map((m) => {
            const period = `${m.year}-${String(m.month).padStart(2, '0')}`
            return (
              <li key={period}>
                <button
                  type="button"
                  onClick={() => handlePick(period, m.label)}
                  className="w-full rounded-2xl bg-surface px-3 py-2 text-left text-sm"
                >
                  {m.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {months && months.length === 0 && (
        <p className="text-foreground/60">Расписание для этой группы не найдено.</p>
      )}
    </div>
  )
}
