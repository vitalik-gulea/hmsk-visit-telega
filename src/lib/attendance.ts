export interface AttendanceMonth {
  year: number
  month: number
  label: string
}

export interface AttendanceStats {
  total: number
  attended: number
  percentage: number
}

export async function fetchAttendanceMonths(group: string): Promise<AttendanceMonth[]> {
  const response = await fetch(`/api/attendance-months?group=${encodeURIComponent(group)}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }

  return data.months
}

export async function fetchAttendancePlayers(group: string): Promise<string[]> {
  const response = await fetch(`/api/attendance-players?group=${encodeURIComponent(group)}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }

  return data.players
}

export async function fetchAttendanceStats(
  group: string,
  player: string,
  period: string,
): Promise<AttendanceStats> {
  const response = await fetch(
    `/api/attendance-stats?group=${encodeURIComponent(group)}&player=${encodeURIComponent(player)}&period=${encodeURIComponent(period)}`,
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }

  return data
}
