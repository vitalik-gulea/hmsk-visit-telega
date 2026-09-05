import { getGoogleAuthClient } from './google-auth.js'
import { getRequiredEnv } from './env.js'

const SHEET_NAME = 'Лист1'

function getUsersSpreadsheetId(): string {
  return getRequiredEnv('USERS_SPREADSHEET_ID')
}

async function sheetsFetch(path: string, init?: RequestInit): Promise<Response> {
  const client = getGoogleAuthClient()
  const { token } = await client.getAccessToken()

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Sheets API error ${response.status}: ${await response.text()}`)
  }
  return response
}

export interface AllowedUser {
  firstName: string
  lastName: string
  username: string
  id: string
}

export async function getAllowedUsers(): Promise<AllowedUser[]> {
  const spreadsheetId = getUsersSpreadsheetId()
  const range = encodeURIComponent(`${SHEET_NAME}!A2:D`)
  const response = await sheetsFetch(`${spreadsheetId}/values/${range}`)
  const { values } = (await response.json()) as { values?: string[][] }

  return (values ?? [])
    .filter((row) => row[3])
    .map(([firstName, lastName, username, id]) => ({
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      username: username ?? '',
      id: String(id).trim(),
    }))
}

export async function isUserAllowed(telegramId: number): Promise<boolean> {
  const users = await getAllowedUsers()
  return users.some((user) => user.id === String(telegramId))
}

export async function appendAllowedUser(user: {
  id: number
  firstName: string
  lastName: string
  username: string
}): Promise<void> {
  const spreadsheetId = getUsersSpreadsheetId()
  const range = encodeURIComponent(`${SHEET_NAME}!A:D`)

  await sheetsFetch(`${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: [[user.firstName, user.lastName, user.username, String(user.id)]],
    }),
  })
}
