import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchGroupSchedule } from './_lib/schedule.js'
import { notifyAdminError } from './_lib/telegram.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const group = req.query.group

  if (typeof group !== 'string' || !group) {
    res.status(400).json({ error: 'Missing "group" query parameter' })
    return
  }

  try {
    const schedule = await fetchGroupSchedule(group)
    res.status(200).json({ schedule })
  } catch (error) {
    await notifyAdminError('GET /api/schedule', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
