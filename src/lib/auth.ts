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

export function fetchAuthStatus(initData: string): Promise<{ allowed: boolean; user: AuthUser }> {
  return postJson('/api/auth-status', { initData })
}

export function requestAccess(initData: string): Promise<{ ok: boolean; alreadyAllowed: boolean }> {
  return postJson('/api/auth-request', { initData })
}
