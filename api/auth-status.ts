import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notifyAdminError, verifyInitData } from './_lib/telegram.js'
import { getAllowedUser } from './_lib/users-sheet.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const { initData } = req.body ?? {}
    if (typeof initData !== 'string' || !initData) {
      res.status(400).json({ error: 'Missing "initData" in body' })
      return
    }

    const user = verifyInitData(initData)
    if (!user) {
      res.status(401).json({ error: 'Invalid Telegram signature' })
      return
    }

    const allowedUser = await getAllowedUser(user.id)
    res.status(200).json({
      allowed: allowedUser !== null,
      role: allowedUser?.role ?? null,
      group: allowedUser?.group || null,
      fullName: allowedUser?.fullName || null,
      user,
    })
  } catch (error) {
    await notifyAdminError('POST /api/auth-status', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
