// The rest of World (ARCHITECTURE.md 1.14): places, factions, lore,
// creatures and items. They work exactly like NPCs (1.13).

import { byName, fold } from './npcs.ts'

export type WorldKind = 'place' | 'faction' | 'lore' | 'creature' | 'item'

export type KindInfo = {
  kind: WorldKind
  /** The World button and list title. */
  plural: string
  /** "Place", for "New place" and the @ list. */
  singular: string
  /** The address: /world/places, /world/places/:id. */
  segment: string
}

export const WORLD_KINDS: KindInfo[] = [
  { kind: 'place', plural: 'Places', singular: 'Place', segment: 'places' },
  { kind: 'faction', plural: 'Factions', singular: 'Faction', segment: 'factions' },
  { kind: 'lore', plural: 'Lore', singular: 'Lore', segment: 'lore' },
  { kind: 'creature', plural: 'Creatures', singular: 'Creature', segment: 'creatures' },
  { kind: 'item', plural: 'Items', singular: 'Item', segment: 'items' },
]

export const kindInfo = (kind: WorldKind) => WORLD_KINDS.find((k) => k.kind === kind)!
export const kindBySegment = (segment: string | undefined) => WORLD_KINDS.find((k) => k.segment === segment)

export const entryPath = (kind: WorldKind, id: string) => `/world/${kindInfo(kind).segment}/${id}`

export type TypeOption = { value: string; label: string }

export const PLACE_TYPES: TypeOption[] = [
  { value: 'region', label: 'Region' },
  { value: 'city', label: 'City' },
  { value: 'town', label: 'Town' },
  { value: 'village', label: 'Village' },
  { value: 'building', label: 'Building' },
  { value: 'dungeon', label: 'Dungeon' },
  { value: 'other', label: 'Other' },
]

export const LORE_TYPES: TypeOption[] = [
  { value: 'history', label: 'History' },
  { value: 'legend', label: 'Legend' },
  { value: 'prophecy', label: 'Prophecy' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
]

/** The types a kind has: places and lore have them, the rest none. */
export function typesFor(kind: WorldKind): TypeOption[] {
  return kind === 'place' ? PLACE_TYPES : kind === 'lore' ? LORE_TYPES : []
}

export const typeLabel = (kind: WorldKind, type: string | null) =>
  typesFor(kind).find((t) => t.value === type)?.label ?? ''

export type WorldEntry = {
  id: string
  version: number
  owner_id: string | null
  kind: WorldKind
  type: string | null
  name: string
  summary: string
  description: string
  parent_id: string | null
}

export const ENTRY_COLUMNS = 'id, version, owner_id, kind, type, name, summary, description, parent_id'

/** An entry without the description, for lists and pickers. */
export type EntrySummary = Pick<WorldEntry, 'id' | 'kind' | 'type' | 'name' | 'summary' | 'parent_id'>
export const ENTRY_SUMMARY_COLUMNS = 'id, kind, type, name, summary, parent_id'

/** The filter box and type chips: every word typed must appear in the name or summary. */
export function filterEntries<E extends Pick<WorldEntry, 'name' | 'summary' | 'type'>>(
  entries: E[],
  query: string,
  type: string | null = null,
): E[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  return entries.filter((e) => {
    if (type && e.type !== type) return false
    const text = fold(`${e.name} ${e.summary}`)
    return words.every((w) => text.includes(w))
  })
}

type Place = Pick<WorldEntry, 'id' | 'name' | 'parent_id'>

/**
 * The places a place is part of, nearest first ("Temple of Ephara" →
 * [Meletis, Region]). Stops at a place the reader cannot see, and never
 * loops, whatever the data says.
 */
export function placeChain<P extends Place>(places: P[], id: string): P[] {
  const byId = new Map(places.map((p) => [p.id, p]))
  const chain: P[] = []
  const seen = new Set([id])
  let parentId = byId.get(id)?.parent_id ?? null
  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId)
    if (!parent) break
    chain.push(parent)
    seen.add(parentId)
    parentId = parent.parent_id
  }
  return chain
}

/** The places directly inside a place, by name: its Inside list. */
export function placesInside<P extends Place>(places: P[], id: string): P[] {
  return places.filter((p) => p.parent_id === id && p.id !== id).sort(byName)
}

/**
 * What a place can be part of: every other place, except the ones inside it
 * (directly or deeper), which would make a loop. The database checks this too.
 */
export function partOfOptions<P extends Place>(places: P[], id: string): P[] {
  return places.filter((p) => p.id !== id && !placeChain(places, p.id).some((a) => a.id === id)).sort(byName)
}
