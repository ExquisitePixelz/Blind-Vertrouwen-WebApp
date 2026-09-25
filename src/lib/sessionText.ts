// Text shown for sessions (ARCHITECTURE.md 1.4). No database code here, so
// the unit tests can load it.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-09-24" → "24 Sep 2026" (d MMM yyyy). The date is used as written, never shifted by time zones. */
export function formatPlayedOn(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  return `${day} ${MONTHS[month - 1]} ${year}`
}

export const SNIPPET_LENGTH = 80

/**
 * The first line of the notes as plain text, for the sessions list: markdown
 * marks removed, at most 80 characters.
 */
export function notesSnippet(notes: string): string {
  const line = notes.split(/\r?\n/).find((l) => l.trim() !== '') ?? ''
  const plain = line
    .replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/, '') // heading, quote, list
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links
    .replace(/(\*\*|__|~~|\*|_|`)/g, '') // bold, italic, strike, code
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > SNIPPET_LENGTH ? `${plain.slice(0, SNIPPET_LENGTH - 1).trimEnd()}…` : plain
}

/** Local "today" as YYYY-MM-DD, for the date picker. */
export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
