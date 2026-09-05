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

/**
 * Parses the schedule sheet's day-month-only dates ("31-авг.", "4-сент.") into
 * a real Date. The sheet never states a year, so we infer it from the club's
 * season: months from August onward belong to `seasonStartYear`, everything
 * else (Jan–Jul) belongs to the following year.
 */
export function resolveScheduleDate(raw: string, seasonStartYear: number): Date | null {
  const match = raw
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})[\s.-]+([а-яё]+)\.?/)
  if (!match) return null

  const day = Number(match[1])
  const monthText = match[2]
  const month = MONTH_ABBREVIATIONS.find(([abbrev]) => monthText.startsWith(abbrev))?.[1]
  if (!month) return null

  const year = month >= 8 ? seasonStartYear : seasonStartYear + 1
  return new Date(Date.UTC(year, month - 1, day))
}

export function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Converts a Date to the numeric day count Excel stores date cells as. */
export function toExcelSerialDate(date: Date): number {
  return Math.round((date.getTime() - EXCEL_EPOCH_UTC_MS) / MS_PER_DAY)
}
