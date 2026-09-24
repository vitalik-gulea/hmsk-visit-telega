import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchAuthStatus, requestAccess, ROLE_COACH, type AuthUser, type UserRole } from '../lib/auth'
import { getTelegramWebApp } from '../lib/telegram'

interface Profile {
  role: UserRole
  // Only ever set for a trainee: the exact roster name and group they picked
  // at signup.
  group: string | null
  fullName: string | null
}

type AuthState =
  | { status: 'loading' }
  | { status: 'no-telegram' }
  | { status: 'error'; message: string }
  | ({ status: 'allowed'; user: AuthUser } & Profile)
  | { status: 'denied'; user: AuthUser; requestSent: boolean }
  | ({ status: 'authorized'; user: AuthUser } & Profile)

interface AuthContextValue {
  state: AuthState
  login: () => void
  sendRequest: (role: UserRole, fullName?: string, group?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Remembers that this device already logged in as this Telegram id, so
// returning users skip straight past the "Войти" button next time.
const STORAGE_KEY = 'hmsk-authorized-telegram-id'

const DEV_USER: AuthUser = { id: 0, firstName: 'Dev', lastName: '', username: 'dev' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const webApp = getTelegramWebApp()
    webApp?.ready()
    webApp?.expand()

    const initData = webApp?.initData
    if (!initData) {
      // Outside Telegram there's no initData to verify — only acceptable
      // during local development, where we just skip straight to "in".
      setState(
        import.meta.env.DEV
          ? { status: 'authorized', user: DEV_USER, role: ROLE_COACH, group: null, fullName: null }
          : { status: 'no-telegram' },
      )
      return
    }

    fetchAuthStatus(initData)
      .then(({ allowed, role, group, fullName, user }) => {
        if (allowed && role && localStorage.getItem(STORAGE_KEY) === String(user.id)) {
          setState({ status: 'authorized', user, role, group, fullName })
        } else if (allowed && role) {
          setState({ status: 'allowed', user, role, group, fullName })
        } else {
          setState({ status: 'denied', user, requestSent: false })
        }
      })
      .catch((error: Error) => setState({ status: 'error', message: error.message }))
  }, [])

  function login() {
    setState((prev) => {
      if (prev.status !== 'allowed') return prev
      localStorage.setItem(STORAGE_KEY, String(prev.user.id))
      return { status: 'authorized', user: prev.user, role: prev.role, group: prev.group, fullName: prev.fullName }
    })
  }

  async function sendRequest(role: UserRole, fullName?: string, group?: string) {
    if (state.status !== 'denied') return
    const initData = getTelegramWebApp()?.initData
    if (!initData) return

    await requestAccess(initData, role, fullName, group)
    setState({ status: 'denied', user: state.user, requestSent: true })
  }

  return <AuthContext.Provider value={{ state, login, sendRequest }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
