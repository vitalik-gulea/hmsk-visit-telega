import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyInitData } from './_lib/telegram.js'
import { isUserAllowed } from './_lib/users-sheet.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  try {
    const allowed = await isUserAllowed(user.id)
    res.status(200).json({ allowed, user })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
