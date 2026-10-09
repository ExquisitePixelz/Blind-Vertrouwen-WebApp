// Links in notes (ARCHITECTURE.md 1.13, 1.14). Typing @ in a notes box offers
// characters, gods, NPCs and the rest of World (places, factions, lore,
// creatures, items); picking one writes an ordinary markdown link with the
// target's ID and no name, e.g. [](npc:3f2a…). No table is needed, and a
// rename does not break the link: Preview shows the current name.
//
// Since 2026-10-09 the saved text holds no names (older links still do, and
// still work), so a player never receives the name of something hidden. The
// Edit box shows each link as @[Ilona], or @[hidden 1] for something the
// viewer cannot see; toEditable and fromEditable convert between the two.

import { fold } from './npcs.ts'
import type { WorldKind } from './world.ts'

export type LinkKind = 'character' | 'god' | 'npc' | WorldKind

/**
 * Something a note can link to, with where it opens. `hidden` (the DM's list
 * only): an NPC or World entry the current campaign's players cannot see.
 */
export type LinkTarget = { kind: LinkKind; id: string; name: string; path: string; hidden?: boolean }

export const KIND_LABELS: Record<LinkKind, string> = {
  character: 'Character',
  god: 'God',
  npc: 'NPC',
  place: 'Place',
  faction: 'Faction',
  lore: 'Lore',
  creature: 'Creature',
  item: 'Item',
}

const KINDS = Object.keys(KIND_LABELS).join('|')

const HREF = new RegExp(`^(${KINDS}):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$`, 'i')

/** The markdown for a link: [](kind:id), without the name (2026-10-09). */
export function linkMarkdown(target: Pick<LinkTarget, 'kind' | 'id'>) {
  return `[](${target.kind}:${target.id.toLowerCase()})`
}

/** A link's href as a target key, or null for an ordinary web link. */
export function parseLinkHref(href: string | undefined): { kind: LinkKind; id: string } | null {
  const match = href ? HREF.exec(href) : null
  return match ? { kind: match[1].toLowerCase() as LinkKind, id: match[2].toLowerCase() } : null
}

const HAS_LINKS = new RegExp(`\\]\\((${KINDS}):`, 'i')

/** True when the text holds at least one of our links (then the names are worth loading). */
export const hasLinks = (text: string) => HAS_LINKS.test(text)

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

// ------------------------------------------------------------------
// The Edit box: @[Name] instead of the saved [](kind:id)
// ------------------------------------------------------------------

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/** A saved link, old ([Ilona](npc:…)) or new ([](npc:…)), or a spoiler's marker ([](spoiler:…)). */
const SAVED_LINK = new RegExp(`\\[(?:\\\\.|[^\\]\\\\])*\\]\\((${KINDS}|spoiler):(${UUID})\\)`, 'gi')

const SPOILER_HREF = new RegExp(`^spoiler:(${UUID})$`, 'i')
const SPOILER_MARK = new RegExp(`\\(spoiler:(${UUID})\\)`, 'gi')

/** A spoiler marker's href as the spoiler's id (1.13, 2026-10-09), or null. */
export function parseSpoilerHref(href: string | undefined): string | null {
  const match = href ? SPOILER_HREF.exec(href) : null
  return match ? match[1].toLowerCase() : null
}

/** The ids of the spoilers in a saved text, each once, in order. */
export function spoilerIds(text: string): string[] {
  return [...new Set([...text.matchAll(SPOILER_MARK)].map((m) => m[1].toLowerCase()))]
}

/**
 * Make the selected passage a spoiler in the Edit box: it is replaced by
 * @[spoiler n], which stands for the new spoiler's marker. Returns the new
 * text and caret.
 */
export function insertSpoiler(text: string, start: number, end: number, id: string, labels: LinkLabels) {
  let n = 1
  while (labels.has(`spoiler ${n}`)) n++
  const label = `spoiler ${n}`
  labels.set(label, `spoiler:${id.toLowerCase()}`)
  const token = `@[${label}]`
  return { text: text.slice(0, start) + token + text.slice(end), caret: start + token.length }
}

/** A link as the Edit box shows it: @[label]. */
const TOKEN = /@\[([^\]\n]+)\]/g

/** Which saved link each @[label] in the Edit box stands for: label → "kind:id". */
export type LinkLabels = Map<string, string>

/** A name as a label: no brackets or new lines, so the token stays one piece. */
const cleanLabel = (name: string) => name.replace(/[[\]\n]/g, '').trim() || 'link'

/** A label not yet used for another link: "Guard", then "Guard (2)". */
function freeLabel(labels: LinkLabels, name: string, href: string) {
  const base = cleanLabel(name)
  for (let n = 1; ; n++) {
    const label = n === 1 ? base : `${base} (${n})`
    const taken = labels.get(label)
    if (taken === undefined || taken === href) return label
  }
}

/**
 * The saved text as the Edit box shows it. A link the viewer can see shows
 * its current name, @[Ilona]; one they cannot see shows @[hidden 1] (for the
 * DM, whose list has everything, that means deleted: @[deleted 1]). So the
 * Edit box never shows a hidden name, and never a code.
 */
export function toEditable(saved: string, targets: LinkTarget[], isDm: boolean): { text: string; labels: LinkLabels } {
  const labels: LinkLabels = new Map()
  const byHref = new Map<string, string>()
  let unknown = 0
  let spoilers = 0
  const text = saved.replace(SAVED_LINK, (_, kind: string, id: string) => {
    const href = `${kind.toLowerCase()}:${id.toLowerCase()}`
    let label = byHref.get(href)
    if (!label) {
      const target = findTarget(targets, href)
      label =
        kind.toLowerCase() === 'spoiler'
          ? `spoiler ${++spoilers}`
          : target
            ? freeLabel(labels, target.name, href)
            : `${isDm ? 'deleted' : 'hidden'} ${++unknown}`
      labels.set(label, href)
      byHref.set(href, label)
    }
    return `@[${label}]`
  })
  return { text, labels }
}

/** The Edit box's text as it is saved: every known @[label] becomes [](kind:id); anything else stays as typed. */
export function fromEditable(text: string, labels: LinkLabels) {
  return text.replace(TOKEN, (token, label: string) => {
    const href = labels.get(label)
    return href ? `[](${href})` : token
  })
}

/**
 * Replace the @… before the caret with @[Name] and a space, and remember
 * which link that label stands for. Returns the new text and caret.
 */
export function insertMention(
  text: string,
  start: number,
  caret: number,
  target: Pick<LinkTarget, 'kind' | 'id' | 'name'>,
  labels: LinkLabels,
) {
  const href = `${target.kind}:${target.id.toLowerCase()}`
  const label = freeLabel(labels, target.name, href)
  labels.set(label, href)
  const token = `@[${label}] `
  return { text: text.slice(0, start) + token + text.slice(caret), caret: start + token.length }
}

/** Look up a link's target in the loaded list. */
export function findTarget(targets: LinkTarget[], href: string | undefined): LinkTarget | null {
  const key = parseLinkHref(href)
  return key ? (targets.find((t) => t.kind === key.kind && t.id.toLowerCase() === key.id) ?? null) : null
}
