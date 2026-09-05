export interface ScheduleEntry {
  date: string
  day: string
  time: string
  hall: string
}

export async function fetchSchedule(group: string): Promise<ScheduleEntry[]> {
  const response = await fetch(`/api/schedule?group=${encodeURIComponent(group)}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }

  return data.schedule
}
