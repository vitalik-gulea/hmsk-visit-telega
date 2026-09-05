export interface RosterEntry {
  row: number
  name: string
  present: boolean | null
}

export interface AttendanceUpdate {
  row: number
  present: boolean
}

export async function fetchRoster(group: string, date: string): Promise<RosterEntry[]> {
  const response = await fetch(
    `/api/roster?group=${encodeURIComponent(group)}&date=${encodeURIComponent(date)}`,
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }

  return data.entries
}

export async function saveAttendance(
  group: string,
  date: string,
  updates: AttendanceUpdate[],
): Promise<void> {
  const response = await fetch('/api/roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group, date, updates }),
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }
}
