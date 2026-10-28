import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireCoach } from './_lib/auth.js'
import { respondWithError } from './_lib/http.js'
import { getRoster, saveAttendance, type AttendanceUpdate } from './_lib/roster.js'

const MAX_UPDATES = 200

function parseUpdates(raw: unknown): AttendanceUpdate[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_UPDATES) return null

  const updates: AttendanceUpdate[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null
    const { row, name, present } = item as Record<string, unknown>
    if (!Number.isInteger(row) || typeof name !== 'string' || !name) return null
    if (present !== true && present !== false && present !== null) return null
    updates.push({ row: row as number, name, present })
  }
  return updates
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Marking attendance is a coach-only action; trainees never see a roster.
    if (!(await requireCoach(req, res))) return

    if (req.method === 'GET') {
      const group = req.query.group
      const date = req.query.date

      if (typeof group !== 'string' || !group || typeof date !== 'string' || !date) {
        res.status(400).json({ error: 'Missing "group" or "date" query parameter' })
        return
      }

      const { players, coaches } = await getRoster(group, date)
      res.status(200).json({ players, coaches })
      return
    }

    const { group, date, updates } = req.body ?? {}
    const parsedUpdates = parseUpdates(updates)

    if (typeof group !== 'string' || !group || typeof date !== 'string' || !date || !parsedUpdates) {
      res.status(400).json({ error: 'Expected { group, date, updates } in body' })
      return
    }

    await saveAttendance(group, date, parsedUpdates)
    res.status(200).json({ ok: true })
  } catch (error) {
    await respondWithError(res, `${req.method} /api/roster`, error)
  }
}
