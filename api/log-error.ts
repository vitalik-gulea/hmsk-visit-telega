import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notifyAdminError } from './_lib/telegram.js'

/**
 * Sink for frontend errors (see src/lib/report-error.ts). Always responds
 * 200 — a broken client-side error report must never itself produce an error
 * worth reporting.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { context, message, stack, url } = (req.body ?? {}) as Record<string, unknown>

  const error = new Error(typeof message === 'string' && message ? message : 'Unknown frontend error')
  if (typeof stack === 'string' && stack) error.stack = stack

  const label = `web: ${typeof context === 'string' ? context : 'unknown'} @ ${typeof url === 'string' ? url : 'unknown URL'}`
  await notifyAdminError(label, error)

  res.status(200).json({ ok: true })
}
