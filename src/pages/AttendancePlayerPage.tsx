import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSelectedGroup } from '../context/selected-group'
import { fetchAttendancePlayers } from '../lib/attendance'

export function AttendancePlayerPage() {
  const { selectedGroup, selectedPeriod, setSelectedPlayerName } = useSelectedGroup()
  const [players, setPlayers] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!selectedGroup) return
    let cancelled = false

    setPlayers(null)
    setError(null)

    fetchAttendancePlayers(selectedGroup)
      .then((result) => {
        if (!cancelled) setPlayers(result)
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
  if (!selectedPeriod) {
    return <Navigate to="/attendance" replace />
  }

  function handlePick(name: string) {
    setSelectedPlayerName(name)
    navigate('/attendance/stats')
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Выберите игрока</h1>

      {error && <p className="text-danger">Не удалось загрузить список игроков: {error}</p>}

      {!error && !players && <p className="text-foreground/60">Загрузка...</p>}

      {players && players.length === 0 && (
        <p className="text-foreground/60">В этой группе никого нет.</p>
      )}

      {players && players.length > 0 && (
        <ul className="flex flex-col gap-2">
          {players.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => handlePick(name)}
                className="w-full rounded-2xl bg-surface px-3 py-2 text-left text-sm"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
