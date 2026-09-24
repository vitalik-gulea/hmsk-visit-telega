import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@heroui/react'
import { useAuth } from '../context/auth'
import { ROLE_COACH, ROLE_TRAINEE } from '../lib/auth'
import { fetchSheets, TRAINING_SPREADSHEET_ID, type SheetInfo } from '../lib/sheets'
import { fetchAttendancePlayers } from '../lib/attendance'

type Step = 'role' | 'group' | 'name'

export function AuthGate({ children }: { children: ReactNode }) {
  const { state, login, sendRequest } = useAuth()
  const [step, setStep] = useState<Step>('role')
  const [sending, setSending] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const [groups, setGroups] = useState<SheetInfo[] | null>(null)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const [players, setPlayers] = useState<string[] | null>(null)
  const [playersError, setPlayersError] = useState<string | null>(null)

  // A trainee picks their group (same list the app uses everywhere else) and
  // then their exact name from that group's roster, instead of typing a name
  // freely — that guarantees the request always matches a real roster entry.
  useEffect(() => {
    if (step !== 'group') return
    let cancelled = false
    setGroups(null)
    setGroupsError(null)

    fetchSheets(TRAINING_SPREADSHEET_ID)
      .then((result) => {
        if (!cancelled) setGroups(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setGroupsError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [step])

  useEffect(() => {
    if (step !== 'name' || !selectedGroup) return
    let cancelled = false
    setPlayers(null)
    setPlayersError(null)

    fetchAttendancePlayers(selectedGroup)
      .then((result) => {
        if (!cancelled) setPlayers(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setPlayersError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [step, selectedGroup])

  if (state.status === 'authorized') return <>{children}</>

  async function handleCoachRequest() {
    setSending(true)
    setRequestError(null)
    try {
      await sendRequest(ROLE_COACH)
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Не удалось отправить запрос')
    } finally {
      setSending(false)
    }
  }

  async function handleTraineePick(name: string) {
    if (!selectedGroup) return
    setSending(true)
    setRequestError(null)
    try {
      await sendRequest(ROLE_TRAINEE, name, selectedGroup)
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Не удалось отправить запрос')
    } finally {
      setSending(false)
    }
  }

  function handlePickGroup(groupName: string) {
    setSelectedGroup(groupName)
    setStep('name')
  }

  function resetToRole() {
    setStep('role')
    setSelectedGroup(null)
    setRequestError(null)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      {state.status === 'loading' && <p className="text-foreground/60">Загрузка...</p>}

      {state.status === 'no-telegram' && <p className="text-danger">Откройте приложение через Telegram</p>}

      {state.status === 'error' && <p className="text-danger">Ошибка: {state.message}</p>}

      {state.status === 'allowed' && (
        <>
          <p>Привет, {state.user.firstName || state.user.username}! У вас есть доступ к приложению.</p>
          <Button onPress={login}>Войти</Button>
        </>
      )}

      {state.status === 'denied' && state.requestSent && (
        <>
          <p>Запрос отправлен.</p>
          <p className="text-foreground/60">Дождитесь подтверждения и откройте приложение снова.</p>
        </>
      )}

      {state.status === 'denied' && !state.requestSent && step === 'role' && (
        <>
          <p>У вас пока нет доступа к приложению.</p>
          <p className="text-foreground/60">Вы тренер или тренирующийся?</p>
          {requestError && <p className="text-danger">{requestError}</p>}
          <div className="flex gap-3">
            <Button onPress={handleCoachRequest} isDisabled={sending}>
              Я тренер
            </Button>
            <Button onPress={() => setStep('group')} isDisabled={sending}>
              Я тренирующийся
            </Button>
          </div>
        </>
      )}

      {state.status === 'denied' && !state.requestSent && step === 'group' && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <p>Выберите свою группу</p>

          {groupsError && <p className="text-danger">Не удалось загрузить группы: {groupsError}</p>}
          {!groupsError && !groups && <p className="text-foreground/60">Загрузка...</p>}

          {groups && groups.length > 0 && (
            <ul className="flex flex-col gap-2 text-left">
              {groups.map((g) => (
                <li key={g.index}>
                  <button
                    type="button"
                    onClick={() => handlePickGroup(g.name)}
                    className="w-full rounded-2xl bg-surface px-3 py-2 text-sm"
                  >
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button variant="ghost" onPress={resetToRole}>
            Назад
          </Button>
        </div>
      )}

      {state.status === 'denied' && !state.requestSent && step === 'name' && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <p>Выберите себя в списке</p>

          {requestError && <p className="text-danger">{requestError}</p>}
          {playersError && <p className="text-danger">Не удалось загрузить список: {playersError}</p>}
          {!playersError && !players && <p className="text-foreground/60">Загрузка...</p>}
          {players && players.length === 0 && (
            <p className="text-foreground/60">В этой группе никого нет.</p>
          )}

          {players && players.length > 0 && (
            <ul className="flex flex-col gap-2 text-left">
              {players.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => handleTraineePick(name)}
                    disabled={sending}
                    className="w-full rounded-2xl bg-surface px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button variant="ghost" onPress={() => setStep('group')} isDisabled={sending}>
            Назад
          </Button>
        </div>
      )}
    </div>
  )
}
