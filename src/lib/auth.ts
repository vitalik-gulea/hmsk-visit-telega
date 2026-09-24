export const ROLE_COACH = 'тренер'
export const ROLE_TRAINEE = 'тренирующийся'
export type UserRole = typeof ROLE_COACH | typeof ROLE_TRAINEE

export interface AuthUser {
  id: number
  firstName: string
  lastName: string
  username: string
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }
  return data
}

export interface AuthStatus {
  allowed: boolean
  role: UserRole | null
  group: string | null
  fullName: string | null
  user: AuthUser
}

export function fetchAuthStatus(initData: string): Promise<AuthStatus> {
  return postJson('/api/auth-status', { initData })
}

export function requestAccess(
  initData: string,
  role: UserRole,
  fullName?: string,
  group?: string,
): Promise<{ ok: boolean; alreadyAllowed: boolean }> {
  return postJson('/api/auth-request', { initData, role, fullName, group })
}
