import ExcelJS from 'exceljs'
import { downloadAsXlsxBuffer, uploadXlsxBuffer } from './drive.js'
import { resolveScheduleDate, isSameDate, toExcelSerialDate } from './dates.js'
import { patchXlsxCells } from './xlsx-patch.js'
import { getRequiredEnv } from './env.js'

function getTrainingSpreadsheetId(): string {
  return getRequiredEnv('TRAINING_SPREADSHEET_ID')
}

const INDEX_COLUMN = 1 // A — a sequential number for every real roster row
const NAME_COLUMN = 2 // B
const FIRST_DATE_COLUMN = 10 // J
const FIRST_DATA_ROW = 2

export interface RosterEntry {
  row: number
  name: string
  present: boolean | null
}

export interface Roster {
  players: RosterEntry[]
  coaches: RosterEntry[]
}

export interface AttendanceUpdate {
  row: number
  present: boolean
}

export type AttendancePeriod = { type: 'all' } | { type: 'month'; year: number; month: number }

export interface AttendanceStats {
  total: number
  attended: number
  percentage: number
}

// Below the "ИТОГО" totals row, group sheets list every coach who might run
// that group's trainings — but some sheets also have unrelated skill/drill
// category rows right after the coaches (no blank line in between), e.g.
// "ОФП", "передача сверху/атака", "атака/защита". Those aren't people, so the
// coach scan stops as soon as a row's name looks like one of these labels.
const SKILL_CATEGORY_KEYWORDS = [
  'офп',
  'игры',
  'передача',
  'атака',
  'защита',
  'блок',
  'падения',
  'подача',
  'прием',
  'приём',
]

function isSkillCategoryLabel(name: string): boolean {
  const lower = name.toLowerCase()
  return SKILL_CATEGORY_KEYWORDS.some((keyword) => lower.includes(keyword))
}

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  // @types/node's generic Buffer<T> is not self-assignable in strict mode here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any)
  return workbook
}

function getGroupSheet(workbook: ExcelJS.Workbook, groupName: string) {
  const sheet = workbook.getWorksheet(groupName)
  if (!sheet) throw new Error(`Группа "${groupName}" не найдена в таблице учёта`)
  return sheet
}

/**
 * Finds the header column for `targetDate`. If it doesn't exist yet, returns
 * where a new one should go: right after the rightmost column that already
 * has a date, so dates always stay in chronological/append order — never the
 * sheet's raw `columnCount`, which includes many blank pre-formatted columns
 * reserved for future dates.
 */
function locateDateColumn(
  sheet: ExcelJS.Worksheet,
  targetDate: Date,
): { column: number; exists: boolean } {
  const headerRow = sheet.getRow(1)
  let lastDateColumn = FIRST_DATE_COLUMN - 1

  for (let c = FIRST_DATE_COLUMN; c <= sheet.columnCount; c++) {
    const value = headerRow.getCell(c).value
    if (value instanceof Date) {
      if (isSameDate(value, targetDate)) return { column: c, exists: true }
      lastDateColumn = c
    }
  }

  const nextColumn = lastDateColumn + 1
  if (nextColumn > sheet.columnCount) {
    throw new Error(
      `В таблице для группы "${sheet.name}" не осталось свободных колонок для новой даты`,
    )
  }
  return { column: nextColumn, exists: false }
}

function resolveTargetDate(rawDate: string): Date {
  const targetDate = resolveScheduleDate(rawDate)
  if (!targetDate) throw new Error(`Не удалось распознать дату: ${rawDate}`)
  return targetDate
}

function cellToPresence(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(n) ? null : n === 1
}

function readEntry(
  sheet: ExcelJS.Worksheet,
  row: number,
  dateColumn: number,
  exists: boolean,
): RosterEntry | null {
  const nameCell = sheet.getRow(row).getCell(NAME_COLUMN).value
  const name = typeof nameCell === 'string' ? nameCell.trim() : ''
  if (!name) return null

  // A column that doesn't exist yet obviously has nobody marked present.
  const presentCell = exists ? sheet.getRow(row).getCell(dateColumn).value : null
  return { row, name, present: exists ? cellToPresence(presentCell) : null }
}

export async function getRoster(groupName: string, rawDate: string): Promise<Roster> {
  const targetDate = resolveTargetDate(rawDate)

  const buffer = await downloadAsXlsxBuffer(getTrainingSpreadsheetId())
  const workbook = await loadWorkbook(buffer)
  const sheet = getGroupSheet(workbook, groupName)
  const { column: dateColumn, exists } = locateDateColumn(sheet, targetDate)

  const players: RosterEntry[] = []
  for (let r = FIRST_DATA_ROW; r <= sheet.rowCount; r++) {
    // Every real kid has a sequential number in column A. The row right
    // after the last kid is the sheet's "ИТОГО" totals row (and sometimes
    // unrelated scratch notes below it) — neither has a number here, so this
    // is a reliable place to stop instead of scanning to the end of the sheet.
    const indexCell = sheet.getRow(r).getCell(INDEX_COLUMN).value
    if (typeof indexCell !== 'number') break

    const entry = readEntry(sheet, r, dateColumn, exists)
    if (entry) players.push(entry)
  }

  // Found independently of the loop above (by its "ИТОГО" text, not by where
  // the index column stops) because a handful of real kid rows are missing
  // their column A number, which would otherwise make that loop mistake a kid
  // row for the totals row and feed leftover kid names into the coach list.
  let itogoRow = -1
  for (let r = FIRST_DATA_ROW; r <= sheet.rowCount; r++) {
    const nameCell = sheet.getRow(r).getCell(NAME_COLUMN).value
    if (typeof nameCell === 'string' && nameCell.trim() === 'ИТОГО') {
      itogoRow = r
      break
    }
  }

  const coaches: RosterEntry[] = []
  if (itogoRow !== -1) {
    for (let r = itogoRow + 1; r <= sheet.rowCount; r++) {
      if (typeof sheet.getRow(r).getCell(INDEX_COLUMN).value === 'number') break
      const entry = readEntry(sheet, r, dateColumn, exists)
      if (!entry || entry.name === 'ИТОГО' || isSkillCategoryLabel(entry.name)) break
      coaches.push(entry)
    }
  }

  return { players, coaches }
}

export async function getGroupPlayerNames(groupName: string): Promise<string[]> {
  const buffer = await downloadAsXlsxBuffer(getTrainingSpreadsheetId())
  const workbook = await loadWorkbook(buffer)
  const sheet = getGroupSheet(workbook, groupName)

  const names: string[] = []
  for (let r = FIRST_DATA_ROW; r <= sheet.rowCount; r++) {
    const indexCell = sheet.getRow(r).getCell(INDEX_COLUMN).value
    if (typeof indexCell !== 'number') break

    const nameCell = sheet.getRow(r).getCell(NAME_COLUMN).value
    const name = typeof nameCell === 'string' ? nameCell.trim() : ''
    if (name) names.push(name)
  }

  return names
}

function normalizedNameWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
}

function sameWords(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((word, i) => word === b[i])
}

export interface PlayerGroupMatch {
  group: string
  name: string
}

/**
 * Finds which single group sheet a player belongs to by exact (order-
 * independent) name match, so a trainee's signup request can be pre-filled
 * with their group. Deliberately strict: a name that matches nobody, or more
 * than one person, returns null rather than guessing — this result later
 * gates what a trainee is allowed to see, so a wrong guess would be a privacy
 * leak, not just a UX glitch.
 */
export async function findPlayerGroup(fullName: string): Promise<PlayerGroupMatch | null> {
  const target = normalizedNameWords(fullName)
  if (target.length === 0) return null

  const buffer = await downloadAsXlsxBuffer(getTrainingSpreadsheetId())
  const workbook = await loadWorkbook(buffer)

  const matches: PlayerGroupMatch[] = []
  for (const sheet of workbook.worksheets) {
    for (let r = FIRST_DATA_ROW; r <= sheet.rowCount; r++) {
      const indexCell = sheet.getRow(r).getCell(INDEX_COLUMN).value
      if (typeof indexCell !== 'number') break

      const nameCell = sheet.getRow(r).getCell(NAME_COLUMN).value
      const name = typeof nameCell === 'string' ? nameCell.trim() : ''
      if (name && sameWords(normalizedNameWords(name), target)) {
        matches.push({ group: sheet.name, name })
      }
    }
  }

  return matches.length === 1 ? matches[0] : null
}

function findPlayerRow(sheet: ExcelJS.Worksheet, playerName: string): number | null {
  const target = playerName.trim()
  for (let r = FIRST_DATA_ROW; r <= sheet.rowCount; r++) {
    const indexCell = sheet.getRow(r).getCell(INDEX_COLUMN).value
    if (typeof indexCell !== 'number') break

    const nameCell = sheet.getRow(r).getCell(NAME_COLUMN).value
    const name = typeof nameCell === 'string' ? nameCell.trim() : ''
    if (name === target) return r
  }
  return null
}

function matchesPeriod(date: Date, period: AttendancePeriod): boolean {
  if (period.type === 'all') return true
  return date.getUTCFullYear() === period.year && date.getUTCMonth() + 1 === period.month
}

/**
 * Attendance is computed from the columns actually present in the training
 * sheet (each one a training that already happened and was recorded), not
 * from the schedule — the schedule also lists future trainings that have no
 * attendance data yet, which would otherwise be counted against the player.
 */
export async function getAttendanceStats(
  groupName: string,
  playerName: string,
  period: AttendancePeriod,
): Promise<AttendanceStats> {
  const buffer = await downloadAsXlsxBuffer(getTrainingSpreadsheetId())
  const workbook = await loadWorkbook(buffer)
  const sheet = getGroupSheet(workbook, groupName)

  const playerRow = findPlayerRow(sheet, playerName)
  if (playerRow === null) {
    throw new Error(`Игрок "${playerName}" не найден в группе "${groupName}"`)
  }

  const headerRow = sheet.getRow(1)
  const playerRowCells = sheet.getRow(playerRow)

  let total = 0
  let attended = 0
  for (let c = FIRST_DATE_COLUMN; c <= sheet.columnCount; c++) {
    const headerValue = headerRow.getCell(c).value
    if (!(headerValue instanceof Date) || !matchesPeriod(headerValue, period)) continue

    total++
    if (cellToPresence(playerRowCells.getCell(c).value) === true) attended++
  }

  const percentage = total > 0 ? Math.round((attended / total) * 100) : 0
  return { total, attended, percentage }
}

export async function saveAttendance(
  groupName: string,
  rawDate: string,
  updates: AttendanceUpdate[],
): Promise<void> {
  const targetDate = resolveTargetDate(rawDate)

  // exceljs can read this workbook fine but cannot safely *write* it back —
  // it fails on a shared SUM(...) formula elsewhere in these sheets. So we
  // only use it here to resolve which column the date lives in, and patch
  // the actual cells via raw XML surgery (see xlsx-patch.ts) on the original
  // downloaded bytes, never through exceljs's writer.
  const spreadsheetId = getTrainingSpreadsheetId()
  const originalBuffer = await downloadAsXlsxBuffer(spreadsheetId)
  const workbook = await loadWorkbook(originalBuffer)
  const sheet = getGroupSheet(workbook, groupName)
  const { column: dateColumn, exists } = locateDateColumn(sheet, targetDate)

  const cellUpdates = updates.map(({ row, present }) => ({
    row,
    col: dateColumn,
    value: present ? 1 : 0,
  }))

  if (!exists) {
    // Brand-new date column: write its header value first. Note this does
    // NOT extend the sheet's shared "ИТОГО" SUM(...) formula range to cover
    // it — that range has to be widened by hand in Excel/Sheets if the coach
    // wants the totals row to include this new date.
    cellUpdates.unshift({ row: 1, col: dateColumn, value: toExcelSerialDate(targetDate) })
  }

  const patchedBuffer = await patchXlsxCells(originalBuffer, groupName, cellUpdates)
  await uploadXlsxBuffer(spreadsheetId, patchedBuffer)
}
