export const TRAINING_SPREADSHEET_ID = import.meta.env.VITE_TRAINING_SPREADSHEET_ID as string

export interface SheetInfo {
  name: string
  index: number
}

async function fetchSheetsFromApi(spreadsheetId: string): Promise<SheetInfo[]> {
  const response = await fetch(`/api/sheets?spreadsheetId=${encodeURIComponent(spreadsheetId)}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }

  return data.sheets
}

const sheetsCache = new Map<string, SheetInfo[]>()
const inflightRequests = new Map<string, Promise<SheetInfo[]>>()

export function getCachedSheets(spreadsheetId: string): SheetInfo[] | null {
  return sheetsCache.get(spreadsheetId) ?? null
}

export function fetchSheets(spreadsheetId: string): Promise<SheetInfo[]> {
  const cached = sheetsCache.get(spreadsheetId)
  if (cached) return Promise.resolve(cached)

  const inflight = inflightRequests.get(spreadsheetId)
  if (inflight) return inflight

  const promise = fetchSheetsFromApi(spreadsheetId)
    .then((sheets) => {
      sheetsCache.set(spreadsheetId, sheets)
      return sheets
    })
    .finally(() => {
      inflightRequests.delete(spreadsheetId)
    })

  inflightRequests.set(spreadsheetId, promise)
  return promise
}
