import { getGoogleAuthClient } from './google-auth.js'

const GOOGLE_SHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet'
export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function driveFetch(
  path: string,
  params: Record<string, string>,
  init?: RequestInit,
) {
  const client = getGoogleAuthClient()
  const { token } = await client.getAccessToken()

  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Drive API error ${response.status}: ${body}`)
  }

  return response
}

export async function downloadAsXlsxBuffer(fileId: string) {
  const metadataResponse = await driveFetch(`files/${fileId}`, { fields: 'mimeType' })
  const { mimeType } = (await metadataResponse.json()) as { mimeType: string }

  const isNativeGoogleSheet = mimeType === GOOGLE_SHEET_MIME_TYPE

  const contentResponse = isNativeGoogleSheet
    ? await driveFetch(`files/${fileId}/export`, { mimeType: XLSX_MIME_TYPE })
    : await driveFetch(`files/${fileId}`, { alt: 'media' })

  return Buffer.from(await contentResponse.arrayBuffer())
}

/**
 * Overwrites a Drive file's binary content in place. Only valid for files that
 * are already a real .xlsx blob (not a native Google Sheet) — that's all we
 * ever write to, so we never need to go through Sheets API export/import here.
 */
export async function uploadXlsxBuffer(fileId: string, buffer: Buffer) {
  const client = getGoogleAuthClient()
  const { token } = await client.getAccessToken()

  const url = new URL(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`)
  url.searchParams.set('uploadType', 'media')

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': XLSX_MIME_TYPE,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: buffer as any,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Drive API upload error ${response.status}: ${body}`)
  }
}
