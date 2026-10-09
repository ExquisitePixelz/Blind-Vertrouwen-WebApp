import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from './supabase'

// Spoilers (ARCHITECTURE.md 1.13, 2026-10-09): a passage in a backstory, an
// NPC description or a World entry's description that only its author, the
// DM and the characters it is revealed to can read. The text holds a marker,
// [](spoiler:<id>); the passage is its own row. The database only returns
// the spoilers the viewer may read, so a missing one shows as "Spoiler".

export type SpoilerParent = { kind: 'character' | 'npc' | 'world_entry'; id: string }

export type Spoiler = {
  id: string
  version: number
  author_id: string | null
  text: string
  to_everyone: boolean
  /** The characters it is revealed to. */
  knowers: string[]
}

/** The spoilers with these ids that the viewer may read, with who knows them. */
async function fetchSpoilers(list: string[]): Promise<Map<string, Spoiler>> {
  const [rows, knowers] = await Promise.all([
    supabase.from('spoilers').select('id, version, author_id, text, to_everyone').in('id', list).then(must),
    supabase.from('spoiler_knowers').select('spoiler_id, character_id').in('spoiler_id', list).then(must),
  ])
  const spoilers = new Map<string, Spoiler>()
  for (const row of rows as Omit<Spoiler, 'knowers'>[]) spoilers.set(row.id, { ...row, knowers: [] })
  for (const k of knowers as { spoiler_id: string; character_id: string }[]) {
    spoilers.get(k.spoiler_id)?.knowers.push(k.character_id)
  }
  return spoilers
}

/** The spoilers in a text that the viewer may read, by id; loaded only when the text has spoilers. */
export function useSpoilers(ids: string[]) {
  const key = ids.join(',')
  const [loaded, setLoaded] = useState<{ key: string; spoilers: Map<string, Spoiler> } | null>(null)

  useEffect(() => {
    if (!key) return
    let cancelled = false
    fetchSpoilers(key.split(',')).then(
      (spoilers) => !cancelled && setLoaded({ key, spoilers }),
      () => {}, // unreadable spoilers simply stay "Spoiler"
    )
    return () => {
      cancelled = true
    }
  }, [key])

  /** After a change: read them again (the new ids, when a spoiler was just made). */
  const reload = useCallback(async (ids?: string[]) => {
    const list = ids ?? key.split(',').filter(Boolean)
    if (list.length) setLoaded({ key: list.join(','), spoilers: await fetchSpoilers(list) })
  }, [key])

  return { spoilers: loaded?.key === key ? loaded.spoilers : null, reload }
}

/** Make a spoiler in a text; returns its id. */
export async function createSpoiler(parent: SpoilerParent, text: string): Promise<string> {
  return must(
    await supabase.rpc('create_spoiler', { p_parent_kind: parent.kind, p_parent_id: parent.id, p_text: text }),
  ) as string
}

/**
 * Save a spoiler's text and who knows it: the row with the conflict guard
 * (3.4), then the knowers that were added or removed.
 */
export async function saveSpoiler(spoiler: Spoiler, text: string, toEveryone: boolean, knowers: string[]) {
  must(
    await supabase
      .from('spoilers')
      .update({ text, to_everyone: toEveryone, version: spoiler.version })
      .eq('id', spoiler.id)
      .select('id')
      .single(),
  )
  const added = knowers.filter((c) => !spoiler.knowers.includes(c))
  const removed = spoiler.knowers.filter((c) => !knowers.includes(c))
  if (added.length) {
    must(await supabase.from('spoiler_knowers').insert(added.map((character_id) => ({ spoiler_id: spoiler.id, character_id }))))
  }
  if (removed.length) {
    must(await supabase.from('spoiler_knowers').delete().eq('spoiler_id', spoiler.id).in('character_id', removed))
  }
}

export async function deleteSpoiler(id: string) {
  must(await supabase.from('spoilers').delete().eq('id', id))
}
