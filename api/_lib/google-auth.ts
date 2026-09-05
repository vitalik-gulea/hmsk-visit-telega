import { JWT } from 'google-auth-library'
import { getRequiredEnv } from './env'

function getCredentials() {
  const base64 = getRequiredEnv('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64')
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8')) as {
    client_email: string
    private_key: string
  }
}

let cachedClient: JWT | null = null

export function getGoogleAuthClient() {
  if (!cachedClient) {
    const { client_email, private_key } = getCredentials()
    cachedClient = new JWT({
      email: client_email,
      key: private_key,
      // Full "drive" (not drive.readonly) is required to write attendance back
      // into the roster .xlsx. It also covers every read we do, including
      // through the Sheets API (a shared file's Drive permissions are what the
      // Sheets API actually checks against, not the OAuth scope name).
      scopes: ['https://www.googleapis.com/auth/drive'],
    })
  }
  return cachedClient
}
