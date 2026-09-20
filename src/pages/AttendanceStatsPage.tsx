import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelectedGroup } from '../context/selected-group'
import { fetchAttendanceStats, type AttendanceStats } from '../lib/attendance'

export function AttendanceStatsPage() {
  const { selectedGroup, selectedPeriod, selectedPeriodLabel, selectedPlayerName } =
    useSelectedGroup()
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedGroup || !selectedPeriod || !selectedPlayerName) return
    let cancelled = false

    setStats(null)
    setError(null)

    fetchAttendanceStats(selectedGroup, selectedPlayerName, selectedPeriod)
      .then((result) => {
        if (!cancelled) setStats(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [selectedGroup, selectedPeriod, selectedPlayerName])

  if (!selectedGroup) return <Navigate to="/" replace />
  if (!selectedPeriod) return <Navigate to="/attendance" replace />
  if (!selectedPlayerName) return <Navigate to="/attendance/player" replace />

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{selectedPlayerName}</h1>
        <p className="text-sm text-foreground/60">{selectedPeriodLabel}</p>
      </div>

      {error && <p className="text-danger">Не удалось посчитать посещаемость: {error}</p>}

      {!error && !stats && <p className="text-foreground/60">Загрузка...</p>}

      {stats && stats.total === 0 && (
        <p className="text-foreground/60">За этот период тренировки не найдены.</p>
      )}

      {stats && stats.total > 0 && (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-6">
          <span className="text-5xl font-bold text-accent">{stats.percentage}%</span>
          <span className="text-sm text-foreground/70">посещаемость</span>
          <span className="mt-4 text-sm text-foreground/70">
            Был(а) на {stats.attended} из {stats.total} тренировок
          </span>
        </div>
      )}
    </div>
  )
}
