export interface ScheduleEntry {
  date: string
  day: string
  time: string
  hall: string
}

export type WeekFilter = 'all' | 'thisWeek' | 'lastWeek'

export async function fetchSchedule(group: string, filter: WeekFilter = 'all'): Promise<ScheduleEntry[]> {
  const response = await fetch(
    `/api/schedule?group=${encodeURIComponent(group)}&filter=${encodeURIComponent(filter)}`,
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`)
  }

  return data.schedule
}
