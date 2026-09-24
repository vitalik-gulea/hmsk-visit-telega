import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSelectedGroup } from '../context/selected-group'
import { fetchAttendancePlayers } from '../lib/attendance'
import { useAuth } from '../context/auth'
import { ROLE_COACH } from '../lib/auth'

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/**
 * Reduces a word to a script-agnostic "phonetic key" (mirrors the backend's
 * findPlayerGroup) so a name typed in Latin letters still lines up with the
 * same name spelled in Cyrillic in the roster.
 */
function phoneticKey(word: string): string {
  const latin = word
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join('')

  return latin
    .replace(/shch|sch/g, 'sh')
    .replace(/kh/g, 'h')
    .replace(/ts|tz/g, 'c')
    .replace(/zh/g, 'j')
    .replace(/yu|iu|ju/g, 'u')
    .replace(/ya|ia|ja/g, 'a')
    .replace(/yo|jo/g, 'o')
    .replace(/ye|je/g, 'e')
    .replace(/[^a-z]/g, '')
    .replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1')
}

function phoneticWords(name: string): string[] {
  return name
    .split(/\s+/)
    .map(phoneticKey)
    .filter(Boolean)
}

/**
 * Trainees can't browse the whole roster (that would let them see anyone's
 * attendance), so we match the name they gave at signup against the roster
 * instead. Only an unambiguous match is trusted — anything else means we
 * can't tell who they are, and they're sent to the coach rather than shown
 * the list.
 */
function findOwnName(players: string[], fullName: string): string | null {
  const own = phoneticWords(fullName)
  if (own.length === 0) return null

  const matches = players.filter((name) => {
    const words = phoneticWords(name)
    return own.every((word) => words.includes(word))
  })

  return matches.length === 1 ? matches[0] : null
}

export function AttendancePlayerPage() {
  const { selectedGroup, selectedPeriod, setSelectedPlayerName } = useSelectedGroup()
  const { state } = useAuth()
  const [players, setPlayers] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const isCoach = state.status === 'authorized' && state.role === ROLE_COACH
  const traineeName =
    state.status === 'authorized'
      ? state.fullName || [state.user.firstName, state.user.lastName].filter(Boolean).join(' ')
      : ''

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

  const ownName = !isCoach && players && traineeName ? findOwnName(players, traineeName) : null

  useEffect(() => {
    if (ownName) {
      setSelectedPlayerName(ownName)
      navigate('/attendance/stats', { replace: true })
    }
  }, [ownName, navigate, setSelectedPlayerName])

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

  if (!isCoach) {
    return (
      <div className="flex flex-col gap-4">
        {!error && !players && <p className="text-foreground/60">Загрузка...</p>}
        {error && <p className="text-danger">Не удалось загрузить список игроков: {error}</p>}
        {players && !ownName && (
          <p className="text-foreground/60">
            Не удалось найти вас в списке этой группы. Обратитесь к тренеру.
          </p>
        )}
      </div>
    )
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
