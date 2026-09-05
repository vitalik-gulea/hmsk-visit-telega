/**
 * Reduces both our own group names ("М2010", "ЖЕН. СОСТ.", "ГР.1(АСРМ)") and the
 * schedule spreadsheet's free-form group labels ("МУЖ 2010", "2013-14 ЖЕН",
 * "группа1", "жен. состав") to the same canonical key, so the two can be matched
 * even though they're never spelled identically.
 * Returns null when a label doesn't correspond to any known group (e.g. "СВЯЗКИ",
 * "Юна", "Группа 3") — those rows are excluded rather than guessed at.
 */
export function canonicalizeGroupName(raw: string): string | null {
  const s = raw.toUpperCase().replace(/Ё/g, 'Е').trim()

  // Our own short forms, e.g. "М2010", "Ж13-14".
  let m = s.match(/^([МЖ])(\d{4})$/)
  if (m) return `${m[1]}${m[2]}`

  m = s.match(/^([МЖ])(\d{2})-(\d{2})$/)
  if (m) return `${m[1]}${m[2]}-${m[3]}`

  // "ЖЕН. СОСТ." / "жен. состав" family.
  if (/^ЖЕН/.test(s) && /СОСТ/.test(s)) {
    return 'ЖЕН_СОСТАВ'
  }

  // Schedule-style full-word gender ("МУЖ"/"ЖЕН") plus a year or year range.
  const genderMatch = s.match(/МУЖ|ЖЕН/)
  if (genderMatch) {
    const genderLetter = genderMatch[0] === 'МУЖ' ? 'М' : 'Ж'

    const rangeMatch = s.match(/(\d{2,4})\s*-\s*(\d{2})\b/)
    if (rangeMatch) {
      const shortStart = rangeMatch[1].slice(-2)
      return `${genderLetter}${shortStart}-${rangeMatch[2]}`
    }

    const yearMatch = s.match(/\b(\d{4})\b/)
    if (yearMatch) {
      return `${genderLetter}${yearMatch[1]}`
    }
  }

  // "ГР.1(АСРМ)" / "группа1" / "Группа 2" family.
  const groupNumberMatch = s.match(/(?:ГРУПП[АЫ]|ГР)\.?\s*(\d)\b/)
  if (groupNumberMatch) {
    return `ГРУППА${groupNumberMatch[1]}`
  }

  return null
}
