import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireTelegramUser } from './_lib/auth.js'
import { getRequiredEnv } from './_lib/env.js'
import { fetchSheetTitles } from './_lib/google-sheets.js'
import { respondWithError } from './_lib/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!requireTelegramUser(req, res)) return

    const spreadsheetId = req.query.spreadsheetId

    if (typeof spreadsheetId !== 'string' || !spreadsheetId) {
      res.status(400).json({ error: 'Missing "spreadsheetId" query parameter' })
      return
    }

    // The service account can read every file shared with it, so never let the
    // client pick which Drive file gets opened — only the training sheet.
    if (spreadsheetId !== getRequiredEnv('TRAINING_SPREADSHEET_ID')) {
      res.status(403).json({ error: 'Нет доступа' })
      return
    }

    const sheets = await fetchSheetTitles(spreadsheetId)
    res.status(200).json({ sheets })
  } catch (error) {
    await respondWithError(res, 'GET /api/sheets', error)
  }
}
