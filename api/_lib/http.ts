import type { VercelResponse } from '@vercel/node'
import { notifyAdminError } from './telegram.js'

/** An error whose message is safe and useful to show the end user as-is. */
export class UserFacingError extends Error {}

/**
 * Anything that isn't a UserFacingError (Google/Telegram API bodies, parser
 * internals, missing env vars...) goes to the admin chat only — never to the
 * client, where it would leak implementation details.
 */
export async function respondWithError(res: VercelResponse, context: string, error: unknown): Promise<void> {
  if (error instanceof UserFacingError) {
    res.status(400).json({ error: error.message })
    return
  }
  await notifyAdminError(context, error)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
}
