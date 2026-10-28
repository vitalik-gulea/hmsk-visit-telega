import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyInitData, type TelegramUser } from './telegram.js'
import { getAllowedUser, ROLE_COACH, type AllowedUser } from './users-sheet.js'

const AUTH_SCHEME = 'tma '

function readInitData(req: VercelRequest): string | null {
  const header = req.headers.authorization
  if (typeof header !== 'string' || !header.startsWith(AUTH_SCHEME)) return null
  return header.slice(AUTH_SCHEME.length) || null
}

/**
 * For endpoints a not-yet-approved user needs too (the signup flow picks a
 * group and name before access is granted): any validly signed Telegram user.
 * Sends the 401 itself and returns null on failure.
 */
export function requireTelegramUser(req: VercelRequest, res: VercelResponse): TelegramUser | null {
  const initData = readInitData(req)
  const user = initData ? verifyInitData(initData) : null
  if (!user) {
    res.status(401).json({ error: 'Требуется авторизация через Telegram' })
    return null
  }
  return user
}

/** A signed Telegram user who is also on the approved-users list. */
export async function requireAllowedUser(req: VercelRequest, res: VercelResponse): Promise<AllowedUser | null> {
  const telegramUser = requireTelegramUser(req, res)
  if (!telegramUser) return null

  const allowed = await getAllowedUser(telegramUser.id)
  if (!allowed) {
    res.status(403).json({ error: 'Нет доступа' })
    return null
  }
  return allowed
}

export async function requireCoach(req: VercelRequest, res: VercelResponse): Promise<AllowedUser | null> {
  const user = await requireAllowedUser(req, res)
  if (!user) return null

  if (user.role !== ROLE_COACH) {
    res.status(403).json({ error: 'Доступно только тренерам' })
    return null
  }
  return user
}

/** Coaches see every group; a trainee only their own. */
export function canAccessGroup(user: AllowedUser, group: string): boolean {
  return user.role === ROLE_COACH || user.group.trim() === group.trim()
}
