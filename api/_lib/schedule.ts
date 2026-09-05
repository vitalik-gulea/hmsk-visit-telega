import { getGoogleAuthClient } from './google-auth.js'
import { canonicalizeGroupName } from './group-name.js'
import { getRequiredEnv } from './env.js'

function getScheduleSpreadsheetId(): string {
  return getRequiredEnv('SCHEDULE_SPREADSHEET_ID')
}

export interface ScheduleEntry {
  date: string
  day: string
  time: string
  hall: string
}

async function sheetsFetch(spreadsheetId: string, path: string, params: Record<string, string>) {
  const client = getGoogleAuthClient()
  const { token } = await client.getAccessToken()

  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Sheets API error ${response.status}: ${body}`)
  }

  return response.json()
}

async function getFirstSheetTitle(spreadsheetId: string): Promise<string> {
  const meta = (await sheetsFetch(spreadsheetId, '', {
    fields: 'sheets.properties(title,index)',
  })) as { sheets: { properties: { title: string; index: number } }[] }

  const firstSheet = [...meta.sheets].sort((a, b) => a.properties.index - b.properties.index)[0]
  return firstSheet.properties.title
}

export async function fetchGroupSchedule(groupName: string): Promise<ScheduleEntry[]> {
  const targetKey = canonicalizeGroupName(groupName)
  if (!targetKey) {
    throw new Error(`Could not canonicalize group name: ${groupName}`)
  }

  const spreadsheetId = getScheduleSpreadsheetId()
  const sheetTitle = await getFirstSheetTitle(spreadsheetId)

  const data = (await sheetsFetch(spreadsheetId, '/values/' + encodeURIComponent(`'${sheetTitle}'!A:E`), {})) as {
    values?: string[][]
  }

  const rows = data.values ?? []

  const entries: ScheduleEntry[] = []
  for (const row of rows) {
    const [date, day, time, hall, group] = row
    if (!date || !group) continue
    if (date.trim().toUpperCase() === 'ДАТА') continue // header row
    if (canonicalizeGroupName(group) === targetKey) {
      entries.push({ date, day: day ?? '', time: time ?? '', hall: hall ?? '' })
    }
  }

  return entries
}
