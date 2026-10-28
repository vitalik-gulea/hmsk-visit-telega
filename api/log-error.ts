import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireTelegramUser } from './_lib/auth.js'
import { notifyAdminError } from './_lib/telegram.js'

function clip(value: unknown, max: number, fallback: string): string {
  return typeof value === 'string' && value ? value.slice(0, max) : fallback
}

/**
 * Sink for frontend errors (see src/lib/report-error.ts). Only accepts reports
 * from validly signed Telegram users — otherwise anyone on the internet could
 * flood the admin's chat through it. Fields are length-capped for the same
 * reason.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    if (!requireTelegramUser(req, res)) return

    const { context, message, stack, url } = (req.body ?? {}) as Record<string, unknown>

    const error = new Error(clip(message, 500, 'Unknown frontend error'))
    if (typeof stack === 'string' && stack) error.stack = stack.slice(0, 2000)

    const label = `web: ${clip(context, 50, 'unknown')} @ ${clip(url, 200, 'unknown URL')}`
    await notifyAdminError(label, error)

    res.status(200).json({ ok: true })
  } catch (error) {
    // A broken error report must never itself produce an error worth reporting.
    console.warn('log-error failed:', error)
    if (!res.headersSent) res.status(200).json({ ok: false })
  }
}
