import type { ReactNode } from 'react'
import { Button } from '@heroui/react'
import { useAuth } from '../context/auth'

export function AuthGate({ children }: { children: ReactNode }) {
  const { state, login, sendRequest } = useAuth()

  if (state.status === 'authorized') return <>{children}</>

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
        ) : (
          <>
            <p>У вас пока нет доступа к приложению.</p>
            <Button onPress={sendRequest}>Запросить доступ</Button>
          </>
        ))}
    </div>
  )
}
