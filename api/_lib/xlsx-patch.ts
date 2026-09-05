import JSZip from 'jszip'

/**
 * Surgically overwrites individual data cells directly in a .xlsx file's raw
 * XML, instead of round-tripping the whole workbook through exceljs.
 *
 * Why: exceljs's writer chokes on some real-world shared-formula layouts
 * ("Shared Formula master must exist above and/or left of clone") when it
 * re-serializes a whole sheet — this file has exactly such a formula (a
 * SUM(...) totals row shared across many columns). Patching only the target
 * `<c>` elements leaves every other byte of the archive — including that
 * formula — completely untouched, so it can never be corrupted by our write.
 */

function columnIndexToLetter(index: number): string {
  let n = index
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function getSheetXmlPath(zip: JSZip, sheetName: string): Promise<string> {
  const workbookFile = zip.file('xl/workbook.xml')
  if (!workbookFile) throw new Error('xl/workbook.xml not found in archive')
  const workbookXml = await workbookFile.async('string')

  const sheetMatch = workbookXml.match(
    new RegExp(`<sheet[^>]*name="${escapeRegExp(sheetName)}"[^>]*r:id="(rId\\d+)"`),
  )
  if (!sheetMatch) throw new Error(`Sheet "${sheetName}" not found in workbook.xml`)
  const rId = sheetMatch[1]

  const relsFile = zip.file('xl/_rels/workbook.xml.rels')
  if (!relsFile) throw new Error('xl/_rels/workbook.xml.rels not found in archive')
  const relsXml = await relsFile.async('string')

  const relRegex = new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]+)"|<Relationship[^>]*Target="([^"]+)"[^>]*Id="${rId}"`)
  const relMatch = relsXml.match(relRegex)
  if (!relMatch) throw new Error(`Relationship "${rId}" not found in workbook.xml.rels`)

  return `xl/${relMatch[1] ?? relMatch[2]}`
}

function patchCellInRowXml(rowInner: string, cellRef: string, value: number): string {
  const cellRegex = new RegExp(`<c r="${cellRef}"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)`)
  const match = rowInner.match(cellRegex)
  if (!match) throw new Error(`Cell ${cellRef} not found in row`)

  const attrs = (match[1] ?? '').replace(/\s+t="[^"]*"/, '') // drop any stale cell-type override
  const inner = match[2] ?? ''
  const formulaMatch = inner.match(/<f[^>]*\/>|<f[^>]*>[\s\S]*?<\/f>/)
  const formulaPart = formulaMatch ? formulaMatch[0] : ''

  const replacement = `<c r="${cellRef}"${attrs}>${formulaPart}<v>${value}</v></c>`
  return rowInner.slice(0, match.index) + replacement + rowInner.slice(match.index! + match[0].length)
}

function patchRowInSheetXml(sheetXml: string, rowNumber: number, cellRef: string, value: number): string {
  const rowRegex = new RegExp(`<row r="${rowNumber}"([^>]*?)(?:/>|>([\\s\\S]*?)</row>)`)
  const match = sheetXml.match(rowRegex)
  if (!match) throw new Error(`Row ${rowNumber} not found`)

  const attrs = match[1] ?? ''
  const inner = match[2]

  let newInner: string
  if (inner === undefined) {
    // Self-closing, empty row.
    newInner = `<c r="${cellRef}"><v>${value}</v></c>`
  } else if (inner.includes(`r="${cellRef}"`)) {
    newInner = patchCellInRowXml(inner, cellRef, value)
  } else {
    // Cell absent from this row — append it (columns stay monotonically
    // ordered in every real row of this file, and our target columns are
    // always the last ones with content).
    newInner = inner + `<c r="${cellRef}"><v>${value}</v></c>`
  }

  const newRow = `<row r="${rowNumber}"${attrs}>${newInner}</row>`
  return sheetXml.slice(0, match.index) + newRow + sheetXml.slice(match.index! + match[0].length)
}

export interface CellUpdate {
  row: number
  col: number
  value: number
}

export async function patchXlsxCells(
  buffer: Buffer,
  sheetName: string,
  updates: CellUpdate[],
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  const sheetPath = await getSheetXmlPath(zip, sheetName)

  const sheetFile = zip.file(sheetPath)
  if (!sheetFile) throw new Error(`${sheetPath} not found in archive`)
  let sheetXml = await sheetFile.async('string')

  for (const { row, col, value } of updates) {
    const cellRef = `${columnIndexToLetter(col)}${row}`
    sheetXml = patchRowInSheetXml(sheetXml, row, cellRef, value)
  }

  zip.file(sheetPath, sheetXml)
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}
