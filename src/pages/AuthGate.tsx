import { useState, type ReactNode } from 'react'
import { Button, Input } from '@heroui/react'
import { useAuth } from '../context/auth'
import { ROLE_COACH, ROLE_TRAINEE } from '../lib/auth'

export function AuthGate({ children }: { children: ReactNode }) {
  const { state, login, sendRequest } = useAuth()
  const [askingTraineeName, setAskingTraineeName] = useState(false)
  const [fullName, setFullName] = useState('')
  const [sending, setSending] = useState(false)

  if (state.status === 'authorized') return <>{children}</>

  async function handleCoachRequest() {
    setSending(true)
    try {
      await sendRequest(ROLE_COACH)
    } finally {
      setSending(false)
    }
  }

  async function handleTraineeRequest() {
    if (!fullName.trim()) return
    setSending(true)
    try {
      await sendRequest(ROLE_TRAINEE, fullName.trim())
    } finally {
      setSending(false)
    }
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

      {state.status === 'denied' &&
        (state.requestSent ? (
          <>
            <p>Запрос отправлен.</p>
            <p className="text-foreground/60">Дождитесь подтверждения и откройте приложение снова.</p>
          </>
        ) : askingTraineeName ? (
          <>
            <p>Введите имя и фамилию — как в списке вашей группы</p>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Иванов Иван"
              className="w-full max-w-xs"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="ghost" onPress={() => setAskingTraineeName(false)} isDisabled={sending}>
                Назад
              </Button>
              <Button onPress={handleTraineeRequest} isDisabled={sending || !fullName.trim()}>
                Запросить доступ
              </Button>
            </div>
          </>
        ) : (
          <>
            <p>У вас пока нет доступа к приложению.</p>
            <p className="text-foreground/60">Вы тренер или тренирующийся?</p>
            <div className="flex gap-3">
              <Button onPress={handleCoachRequest} isDisabled={sending}>
                Я тренер
              </Button>
              <Button onPress={() => setAskingTraineeName(true)} isDisabled={sending}>
                Я тренирующийся
              </Button>
            </div>
          </>
        ))}
    </div>
  )
}
