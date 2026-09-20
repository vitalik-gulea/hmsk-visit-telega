import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAttendanceStats, type AttendancePeriod } from './_lib/roster.js'
import { notifyAdminError } from './_lib/telegram.js'

function parsePeriod(raw: string): AttendancePeriod | null {
  if (raw === 'all') return { type: 'all' }

  const match = raw.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null

  return { type: 'month', year, month }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const group = req.query.group
  const player = req.query.player
  const periodRaw = req.query.period

  if (typeof group !== 'string' || !group || typeof player !== 'string' || !player) {
    res.status(400).json({ error: 'Missing "group" or "player" query parameter' })
    return
  }

  const period = typeof periodRaw === 'string' ? parsePeriod(periodRaw) : null
  if (!period) {
    res.status(400).json({ error: 'Missing or invalid "period" query parameter' })
    return
  }

  try {
    const stats = await getAttendanceStats(group, player, period)
    res.status(200).json(stats)
  } catch (error) {
    await notifyAdminError('GET /api/attendance-stats', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
