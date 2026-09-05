import type { VercelRequest, VercelResponse } from '@vercel/node'
import './_lib/telegram.js'

/**
 * Fire-and-forget sink for frontend errors (see src/lib/report-error.ts).
 * Always responds 200 — a broken client-side error report must never itself
 * produce an error worth reporting.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { context, message, stack, url } = (req.body ?? {}) as Record<string, unknown>
  console.error(
    `[web] ${typeof context === 'string' ? context : 'unknown'}\n` +
      `${typeof url === 'string' ? url : ''}\n` +
      `${typeof message === 'string' ? message : ''}\n` +
      `${typeof stack === 'string' ? stack : ''}`,
  )

  res.status(200).json({ ok: true })
}
