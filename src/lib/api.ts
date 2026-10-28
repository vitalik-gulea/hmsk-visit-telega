import { getTelegramWebApp } from './telegram'

/**
 * fetch() for our own /api routes: attaches the Telegram Mini App's signed
 * initData, which the server verifies on every call (see api/_lib/auth.ts).
 */
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const initData = getTelegramWebApp()?.initData
  const headers = new Headers(init.headers)
  if (initData) headers.set('Authorization', `tma ${initData}`)
  return fetch(input, { ...init, headers })
}
