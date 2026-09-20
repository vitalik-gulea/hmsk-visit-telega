import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchGroupSchedule } from './_lib/schedule.js'
import { notifyAdminError } from './_lib/telegram.js'
import type { WeekFilter } from './_lib/dates.js'

const VALID_WEEK_FILTERS: WeekFilter[] = ['all', 'thisWeek', 'lastWeek']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const group = req.query.group
  const filter = req.query.filter

  if (typeof group !== 'string' || !group) {
    res.status(400).json({ error: 'Missing "group" query parameter' })
    return
  }

  const weekFilter: WeekFilter =
    typeof filter === 'string' && VALID_WEEK_FILTERS.includes(filter as WeekFilter)
      ? (filter as WeekFilter)
      : 'all'

  try {
    const schedule = await fetchGroupSchedule(group, weekFilter)
    res.status(200).json({ schedule })
  } catch (error) {
    await notifyAdminError('GET /api/schedule', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
