// NPCs (ARCHITECTURE.md 1.13): world content, revealed per campaign, edited
// together as a shared wiki. Secrets and stats are the DM's only.

import type { Ability } from './character.ts'

export type NpcStatus = 'alive' | 'dead' | 'missing' | 'unknown'

export type Npc = {
  id: string
  version: number
  owner_id: string | null
  name: string
  role: string
  status: NpcStatus
  location: string
  faction: string
  description: string
  /** The place and faction entries (1.14); `location` and `faction` keep their names as text. */
  place_id: string | null
  faction_id: string | null
}

export const NPC_COLUMNS = 'id, version, owner_id, name, role, status, location, faction, description, place_id, faction_id'

/** An NPC without the description, for the list. */
export type NpcSummary = Omit<Npc, 'description' | 'version' | 'owner_id' | 'place_id' | 'faction_id'>
export const NPC_SUMMARY_COLUMNS = 'id, name, role, status, location, faction'

/** The DM's own row per NPC or world entry: secrets and stats (audience 'dm'; 1.13, 1.14). */
export type Secrets = {
  id: string
  version: number
  secrets: string
  has_stats: boolean
  ac: number | null
  hp_max: number | null
  speed: number | null
  cr: string | null
  actions: string
} & Record<Ability, number>

export const SECRETS_COLUMNS =
  'id, version, secrets, has_stats, ac, hp_max, speed, cr, actions, ' +
  'strength, dexterity, constitution, intelligence, wisdom, charisma'

export const NPC_STATUSES: { value: NpcStatus; label: string }[] = [
  { value: 'alive', label: 'Alive' },
  { value: 'dead', label: 'Dead' },
  { value: 'missing', label: 'Missing' },
  { value: 'unknown', label: 'Unknown' },
]

export const npcStatusLabel = (status: NpcStatus) => NPC_STATUSES.find((s) => s.value === status)!.label

/** Challenge ratings, as the database allows them: 0, 1/8, 1/4, 1/2, 1 … 30. */
export const CR_VALUES: string[] = ['0', '1/8', '1/4', '1/2', ...Array.from({ length: 30 }, (_, i) => String(i + 1))]

/** "location · faction", leaving out empty parts. */
export const npcPlace = (npc: Pick<Npc, 'location' | 'faction'>) => [npc.location, npc.faction].filter(Boolean).join(' · ')

/** Lower case without accents, for matching typed text ("Éphara" finds "ephara"). */
export function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

/** The filter box: every word typed must appear in the name, role, location or faction. */
export function filterNpcs<N extends Pick<Npc, 'name' | 'role' | 'location' | 'faction'>>(npcs: N[], query: string): N[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return npcs
  return npcs.filter((n) => {
    const text = fold([n.name, n.role, n.location, n.faction].join(' '))
    return words.every((w) => text.includes(w))
  })
}

/**
 * The list (1.13): sorted by name. The DM gets a Hidden group of NPCs not
 * revealed to the current campaign; players only ever receive revealed ones.
 */
export function groupNpcs<N extends { id: string; name: string }>(npcs: N[], revealed: Set<string> | null) {
  const sorted = [...npcs].sort(byName)
  if (!revealed) return { hidden: [] as N[], shown: sorted }
  return { hidden: sorted.filter((n) => !revealed.has(n.id)), shown: sorted.filter((n) => revealed.has(n.id)) }
}
