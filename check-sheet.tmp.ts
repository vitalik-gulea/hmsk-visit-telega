import { getGoogleAuthClient } from './api/_lib/google-auth'

const SPREADSHEET_ID = '1ZO2hEpPHsFYmC1hE2gpmTyVj88zsOPJDJcHBHxzlK2s'

async function main() {
  const client = getGoogleAuthClient()
  const { token } = await client.getAccessToken()

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=properties.title,sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  console.log('meta status', metaRes.status)
  console.log(await metaRes.text())

  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A1:Z10`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  console.log('values status', valuesRes.status)
  console.log(await valuesRes.text())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
