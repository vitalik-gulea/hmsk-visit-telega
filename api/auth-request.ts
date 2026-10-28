import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requestAccess } from './_lib/access-request.js'
import { respondWithError } from './_lib/http.js'
import { verifyInitData } from './_lib/telegram.js'
import { ROLE_COACH, ROLE_TRAINEE } from './_lib/users-sheet.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const { initData, role, fullName, group } = req.body ?? {}
    if (typeof initData !== 'string' || !initData) {
      res.status(400).json({ error: 'Missing "initData" in body' })
      return
    }
    if (role !== ROLE_COACH && role !== ROLE_TRAINEE) {
      res.status(400).json({ error: 'Missing or invalid "role" in body' })
      return
    }
    // Hard caps: these end up in a Telegram message and a Sheets row.
    if (
      (typeof fullName === 'string' && fullName.length > 200) ||
      (typeof group === 'string' && group.length > 100)
    ) {
      res.status(400).json({ error: 'Слишком длинные значения' })
      return
    }
    if (role === ROLE_TRAINEE && (typeof fullName !== 'string' || !fullName.trim())) {
      res.status(400).json({ error: 'Missing "fullName" in body for a trainee' })
      return
    }
    if (role === ROLE_TRAINEE && (typeof group !== 'string' || !group.trim())) {
      res.status(400).json({ error: 'Missing "group" in body for a trainee' })
      return
    }

    const user = verifyInitData(initData)
    if (!user) {
      res.status(401).json({ error: 'Invalid Telegram signature' })
      return
    }

    const { alreadyAllowed } = await requestAccess(
      user,
      role,
      role === ROLE_TRAINEE ? fullName.trim() : undefined,
      role === ROLE_TRAINEE ? group.trim() : undefined,
    )
    res.status(200).json({ ok: true, alreadyAllowed })
  } catch (error) {
    await respondWithError(res, 'POST /api/auth-request', error)
  }
}
