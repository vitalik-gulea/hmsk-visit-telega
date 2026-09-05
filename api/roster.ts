import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRoster, saveAttendance } from './_lib/roster.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const group = req.query.group
    const date = req.query.date

    if (typeof group !== 'string' || !group || typeof date !== 'string' || !date) {
      res.status(400).json({ error: 'Missing "group" or "date" query parameter' })
      return
    }

    try {
      const entries = await getRoster(group, date)
      res.status(200).json({ entries })
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
    return
  }

  if (req.method === 'POST') {
    const { group, date, updates } = req.body ?? {}

    if (typeof group !== 'string' || !group || typeof date !== 'string' || !date || !Array.isArray(updates)) {
      res.status(400).json({ error: 'Expected { group, date, updates } in body' })
      return
    }

    try {
      await saveAttendance(group, date, updates)
      res.status(200).json({ ok: true })
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
