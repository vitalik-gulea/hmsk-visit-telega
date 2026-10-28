import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canAccessGroup, requireAllowedUser } from './_lib/auth.js'
import { respondWithError } from './_lib/http.js'
import { fetchGroupSchedule } from './_lib/schedule.js'
import type { WeekFilter } from './_lib/dates.js'

const VALID_WEEK_FILTERS: WeekFilter[] = ['all', 'thisWeek', 'lastWeek']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAllowedUser(req, res)
    if (!user) return

    const group = req.query.group
    const filter = req.query.filter

    if (typeof group !== 'string' || !group) {
      res.status(400).json({ error: 'Missing "group" query parameter' })
      return
    }

    if (!canAccessGroup(user, group)) {
      res.status(403).json({ error: 'Нет доступа к этой группе' })
      return
    }

    const weekFilter: WeekFilter =
      typeof filter === 'string' && VALID_WEEK_FILTERS.includes(filter as WeekFilter)
        ? (filter as WeekFilter)
        : 'all'

    const schedule = await fetchGroupSchedule(group, weekFilter)
    res.status(200).json({ schedule })
  } catch (error) {
    await respondWithError(res, 'GET /api/schedule', error)
  }
}
