import { must, supabase } from './supabase'

export type God = {
  id: string
  version: number
  world_id: string
  slug: string
  name: string
  epithet: string
  alignment: string
  domains: string
  symbol: string
  notes: string
  party_attitude: number
}

/** value(from → to); a missing pair means Neutral (4). */
export type Relationship = { from_god_id: string; to_god_id: string; value: number }

const GOD_COLUMNS = 'id, version, world_id, slug, name, epithet, alignment, domains, symbol, notes, party_attitude'

export const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

export async function loadGods(): Promise<God[]> {
  const gods = must(await supabase.from('gods').select(GOD_COLUMNS).is('deleted_at', null)) as God[]
  return gods.sort(byName)
}

export async function loadRelationships(): Promise<Relationship[]> {
  return must(await supabase.from('god_relationships').select('from_god_id, to_god_id, value')) as Relationship[]
}

/** A URL-safe id for a new god, e.g. "Nylea" → "nylea". Fixed once created. */
export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'god'
  )
}
