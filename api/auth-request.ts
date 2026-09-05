import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requestAccess } from './_lib/access-request.js'
import { notifyAdminError, verifyInitData } from './_lib/telegram.js'

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

    const { alreadyAllowed } = await requestAccess(user)
    res.status(200).json({ ok: true, alreadyAllowed })
  } catch (error) {
    await notifyAdminError('POST /api/auth-request', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
