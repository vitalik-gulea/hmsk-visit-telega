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

// Column E of the sheet holds the role, spelled out in Russian so it stays
// directly editable by hand in Sheets. Rows created before this column
// existed have nothing there, so they default to the coach role — every
// user allowed prior to roles exists precisely because a coach approved them.
export const ROLE_COACH = 'тренер'
export const ROLE_TRAINEE = 'тренирующийся'
export type UserRole = typeof ROLE_COACH | typeof ROLE_TRAINEE

function parseRole(raw: string | undefined): UserRole {
  return raw?.trim().toLowerCase() === ROLE_TRAINEE ? ROLE_TRAINEE : ROLE_COACH
}

export interface AllowedUser {
  firstName: string
  lastName: string
  username: string
  id: string
  role: UserRole
  // Only meaningful for trainees: the name they typed at signup (matched
  // against the roster) and the group it resolved to. Empty for coaches.
  fullName: string
  group: string
}

export async function getAllowedUsers(): Promise<AllowedUser[]> {
  const spreadsheetId = getUsersSpreadsheetId()
  const range = encodeURIComponent(`${SHEET_NAME}!A2:G`)
  const response = await sheetsFetch(`${spreadsheetId}/values/${range}`)
  const { values } = (await response.json()) as { values?: string[][] }

  return (values ?? [])
    .filter((row) => row[3])
    .map(([firstName, lastName, username, id, role, fullName, group]) => ({
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      username: username ?? '',
      id: String(id).trim(),
      role: parseRole(role),
      fullName: fullName ?? '',
      group: group ?? '',
    }))
}

export async function getAllowedUser(telegramId: number): Promise<AllowedUser | null> {
  const users = await getAllowedUsers()
  return users.find((user) => user.id === String(telegramId)) ?? null
}

export async function isUserAllowed(telegramId: number): Promise<boolean> {
  return (await getAllowedUser(telegramId)) !== null
}

export async function appendAllowedUser(user: {
  id: number
  firstName: string
  lastName: string
  username: string
  role: UserRole
  fullName?: string
  group?: string
}): Promise<void> {
  const spreadsheetId = getUsersSpreadsheetId()
  const range = encodeURIComponent(`${SHEET_NAME}!A:G`)

  await sheetsFetch(`${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: [
        [
          user.firstName,
          user.lastName,
          user.username,
          String(user.id),
          user.role,
          user.fullName ?? '',
          user.group ?? '',
        ],
      ],
    }),
  })
}
