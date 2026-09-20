import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGroupPlayerNames } from './_lib/roster.js'
import { notifyAdminError } from './_lib/telegram.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const group = req.query.group

  if (typeof group !== 'string' || !group) {
    res.status(400).json({ error: 'Missing "group" query parameter' })
    return
  }

  try {
    const players = await getGroupPlayerNames(group)
    res.status(200).json({ players })
  } catch (error) {
    await notifyAdminError('GET /api/attendance-players', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
