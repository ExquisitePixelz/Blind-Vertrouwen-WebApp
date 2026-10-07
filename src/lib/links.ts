// Links in notes (ARCHITECTURE.md 1.13). Typing @ in a notes box offers
// characters, gods and NPCs; picking one writes an ordinary markdown link
// with the target's ID, e.g. [Ilona](npc:3f2a…). No table is needed, and a
// rename does not break the link: Preview shows the current name.

import { fold } from './npcs.ts'

export type LinkKind = 'character' | 'god' | 'npc'

/** Something a note can link to, with where it opens. */
export type LinkTarget = { kind: LinkKind; id: string; name: string; path: string }

export const KIND_LABELS: Record<LinkKind, string> = { character: 'Character', god: 'God', npc: 'NPC' }

const HREF = /^(character|god|npc):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** The markdown for a link: [name](kind:id). Brackets in the name are escaped. */
export function linkMarkdown(target: Pick<LinkTarget, 'kind' | 'id' | 'name'>) {
  return `[${target.name.replace(/([\\[\]])/g, '\\$1')}](${target.kind}:${target.id})`
}

/** A link's href as a target key, or null for an ordinary web link. */
export function parseLinkHref(href: string | undefined): { kind: LinkKind; id: string } | null {
  const match = href ? HREF.exec(href) : null
  return match ? { kind: match[1].toLowerCase() as LinkKind, id: match[2].toLowerCase() } : null
}

/** True when the text holds at least one of our links (then the names are worth loading). */
export const hasLinks = (text: string) => /\]\((character|god|npc):/i.test(text)

const MAX_QUERY = 40

/**
 * The @ being typed just before the caret, if any: where it starts and the
 * letters after it. The @ must start the text or follow a space, a new line
 * or an opening bracket (so e-mail addresses do not open the list).
 */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at < 0) return null
  const query = before.slice(at + 1)
  if (query.length > MAX_QUERY || /[\n@[\]()]/.test(query) || /^\s/.test(query)) return null
  if (at > 0 && !/[\s([]/.test(before[at - 1])) return null
  return { start: at, query }
}

/**
 * What the @ list offers (1.13): names matching what was typed, at most
 * `limit`. A name that starts with it comes first, then one with a word
 * that starts with it, then one that contains it; each by name.
 */
export function mentionMatches<T extends Pick<LinkTarget, 'name'>>(targets: T[], query: string, limit = 8): T[] {
  const q = fold(query.trim())
  const rank = (name: string) => {
    const n = fold(name)
    if (n.startsWith(q)) return 0
    if (n.split(/[\s'’-]+/).some((word) => word.startsWith(q))) return 1
    return n.includes(q) ? 2 : -1
  }
  return targets
    .map((t) => ({ t, r: rank(t.name) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.t.name.localeCompare(b.t.name, undefined, { sensitivity: 'base' }))
    .slice(0, limit)
    .map((x) => x.t)
}

/** Replace the @… before the caret with the link and a space; returns the new text and caret. */
export function insertMention(text: string, start: number, caret: number, target: Pick<LinkTarget, 'kind' | 'id' | 'name'>) {
  const link = `${linkMarkdown(target)} `
  return { text: text.slice(0, start) + link + text.slice(caret), caret: start + link.length }
}

/** Look up a link's target in the loaded list. */
export function findTarget(targets: LinkTarget[], href: string | undefined): LinkTarget | null {
  const key = parseLinkHref(href)
  return key ? (targets.find((t) => t.kind === key.kind && t.id.toLowerCase() === key.id) ?? null) : null
}
