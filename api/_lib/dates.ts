const MONTH_ABBREVIATIONS: [string, number][] = [
  ['янв', 1],
  ['февр', 2],
  ['мар', 3],
  ['апр', 4],
  ['мая', 5], // "мая"
  ['июн', 6],
  ['июл', 7],
  ['авг', 8],
  ['сент', 9],
  ['окт', 10],
  ['нояб', 11],
  ['дек', 12],
]

export const SEASON_START_YEAR = 2026

/**
 * Parses the schedule sheet's day-month-only dates ("31-авг.", "4-сент.") as
 * well as the numeric "DD.MM" dates used when marking attendance ("23.09")
 * into a real Date. Neither format states a year, so we infer it from the
 * club's season: months from August onward belong to `seasonStartYear`,
 * everything else (Jan–Jul) belongs to the following year.
 */
export function resolveScheduleDate(raw: string, seasonStartYear: number = SEASON_START_YEAR): Date | null {
  const trimmed = raw.trim().toLowerCase()

  const monthNameMatch = trimmed.match(/^(\d{1,2})[\s.-]+([а-яё]+)\.?/)
  if (monthNameMatch) {
    const day = Number(monthNameMatch[1])
    const monthText = monthNameMatch[2]
    const month = MONTH_ABBREVIATIONS.find(([abbrev]) => monthText.startsWith(abbrev))?.[1]
    if (!month) return null

    const year = month >= 8 ? seasonStartYear : seasonStartYear + 1
    return new Date(Date.UTC(year, month - 1, day))
  }

  const numericMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.?$/)
  if (numericMatch) {
    const day = Number(numericMatch[1])
    const month = Number(numericMatch[2])
    if (month < 1 || month > 12) return null

    const year = month >= 8 ? seasonStartYear : seasonStartYear + 1
    return new Date(Date.UTC(year, month - 1, day))
  }

  return null
}

export function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

export type WeekFilter = 'all' | 'thisWeek' | 'lastWeek'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday))
}

/** Whether `date` falls in the calendar week (Mon–Sun) `filter` refers to, relative to `today`. */
export function matchesWeekFilter(date: Date, filter: WeekFilter, today: Date = new Date()): boolean {
  if (filter === 'all') return true

  const thisWeekStart = startOfWeek(today)
  const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * DAY_MS)

  if (filter === 'thisWeek') {
    return date >= thisWeekStart && date < thisWeekEnd
  }

  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * DAY_MS)
  return date >= lastWeekStart && date < thisWeekStart
}

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Converts a Date to the numeric day count Excel stores date cells as. */
export function toExcelSerialDate(date: Date): number {
  return Math.round((date.getTime() - EXCEL_EPOCH_UTC_MS) / MS_PER_DAY)
}
