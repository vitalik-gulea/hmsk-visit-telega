import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchSheetTitles } from './_lib/google-sheets.js'
import { notifyAdminError } from './_lib/telegram.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const spreadsheetId = req.query.spreadsheetId

  if (typeof spreadsheetId !== 'string' || !spreadsheetId) {
    res.status(400).json({ error: 'Missing "spreadsheetId" query parameter' })
    return
  }

  try {
    const sheets = await fetchSheetTitles(spreadsheetId)
    res.status(200).json({ sheets })
  } catch (error) {
    await notifyAdminError('GET /api/sheets', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
