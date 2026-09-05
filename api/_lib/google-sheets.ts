import ExcelJS from 'exceljs'
import { downloadAsXlsxBuffer } from './drive'

export async function fetchSheetTitles(fileId: string) {
  const buffer = await downloadAsXlsxBuffer(fileId)

  const workbook = new ExcelJS.Workbook()
  // @types/node's generic Buffer<T> is not self-assignable in strict mode here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any)

  return workbook.worksheets.map((sheet) => ({
    name: sheet.name,
    index: sheet.id,
  }))
}
