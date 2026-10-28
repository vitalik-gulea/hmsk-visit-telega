import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canAccessGroup, requireAllowedUser } from './_lib/auth.js'
import { respondWithError } from './_lib/http.js'
import { fetchGroupScheduleMonths } from './_lib/schedule.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAllowedUser(req, res)
    if (!user) return

    const group = req.query.group

    if (typeof group !== 'string' || !group) {
      res.status(400).json({ error: 'Missing "group" query parameter' })
      return
    }

    if (!canAccessGroup(user, group)) {
      res.status(403).json({ error: 'Нет доступа к этой группе' })
      return
    }

    const months = await fetchGroupScheduleMonths(group)
    res.status(200).json({ months })
  } catch (error) {
    await respondWithError(res, 'GET /api/attendance-months', error)
  }
}
