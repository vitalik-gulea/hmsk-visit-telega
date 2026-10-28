import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireTelegramUser } from './_lib/auth.js'
import { respondWithError } from './_lib/http.js'
import { getGroupPlayerNames } from './_lib/roster.js'

// Open to any signed Telegram user (not only approved ones): the signup flow
// has a trainee pick their name from this list before access is granted.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!requireTelegramUser(req, res)) return

    const group = req.query.group

    if (typeof group !== 'string' || !group) {
      res.status(400).json({ error: 'Missing "group" query parameter' })
      return
    }

    const players = await getGroupPlayerNames(group)
    res.status(200).json({ players })
  } catch (error) {
    await respondWithError(res, 'GET /api/attendance-players', error)
  }
}
