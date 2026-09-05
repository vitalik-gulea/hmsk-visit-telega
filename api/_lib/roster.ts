import ExcelJS from 'exceljs'
import { downloadAsXlsxBuffer, uploadXlsxBuffer } from './drive.js'
import { resolveScheduleDate, isSameDate, toExcelSerialDate } from './dates.js'
import { patchXlsxCells } from './xlsx-patch.js'
import { getRequiredEnv } from './env.js'

function getTrainingSpreadsheetId(): string {
  return getRequiredEnv('TRAINING_SPREADSHEET_ID')
}

const SEASON_START_YEAR = 2026

const INDEX_COLUMN = 1 // A — a sequential number for every real roster row
const NAME_COLUMN = 2 // B
const FIRST_DATE_COLUMN = 10 // J
const FIRST_DATA_ROW = 2

export interface RosterEntry {
  row: number
  name: string
  present: boolean | null
}

export interface AttendanceUpdate {
  row: number
  present: boolean
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
  const targetDate = resolveScheduleDate(rawDate, SEASON_START_YEAR)
  if (!targetDate) throw new Error(`Не удалось распознать дату: ${rawDate}`)
  return targetDate
}

function cellToPresence(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(n) ? null : n === 1
}

export async function getRoster(groupName: string, rawDate: string): Promise<RosterEntry[]> {
  const targetDate = resolveTargetDate(rawDate)

  const buffer = await downloadAsXlsxBuffer(getTrainingSpreadsheetId())
  const workbook = await loadWorkbook(buffer)
  const sheet = getGroupSheet(workbook, groupName)
  const { column: dateColumn, exists } = locateDateColumn(sheet, targetDate)

  const entries: RosterEntry[] = []
  for (let r = FIRST_DATA_ROW; r <= sheet.rowCount; r++) {
    // Every real kid has a sequential number in column A. The row right
    // after the last kid is the sheet's "ИТОГО" totals row (and sometimes
    // unrelated scratch notes below it) — neither has a number here, so this
    // is a reliable place to stop instead of scanning to the end of the sheet.
    const indexCell = sheet.getRow(r).getCell(INDEX_COLUMN).value
    if (typeof indexCell !== 'number') break

    const nameCell = sheet.getRow(r).getCell(NAME_COLUMN).value
    const name = typeof nameCell === 'string' ? nameCell.trim() : ''
    if (!name) continue

    // A column that doesn't exist yet obviously has nobody marked present.
    const presentCell = exists ? sheet.getRow(r).getCell(dateColumn).value : null
    entries.push({ row: r, name, present: exists ? cellToPresence(presentCell) : null })
  }

  return entries
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
