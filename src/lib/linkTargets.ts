import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { byName } from './gods'
import type { LinkTarget } from './links'
import { useMe } from './me'
import { must, supabase } from './supabase'
import { entryPath, type WorldKind } from './world'

// What notes can link to (ARCHITECTURE.md 1.13, 1.14): the characters of
// the current campaign, the gods, and the NPCs, places, factions, lore,
// creatures and items the user can see. IDs and names only. One list is
// shared by every notes box on a screen and kept for 30 seconds, like a
// screen's data on a return to the tab (1.11).

const FRESH_MS = 30_000
let cache: { key: string; at: number; promise: Promise<LinkTarget[]> } | null = null

/** After creating or renaming something, so the next @ list has it. */
export function forgetLinkTargets() {
  cache = null
}

function loadLinkTargets(campaignId: string | null): Promise<LinkTarget[]> {
  const key = campaignId ?? ''
  if (cache && cache.key === key && Date.now() - cache.at < FRESH_MS) return cache.promise
  const promise = (async () => {
    const [characters, gods, npcs, entries] = await Promise.all([
      campaignId
        ? supabase.from('characters').select('id, name').eq('campaign_id', campaignId).is('deleted_at', null).then(must)
        : Promise.resolve([]),
      supabase.from('gods').select('id, name, slug').is('deleted_at', null).then(must),
      supabase.from('npcs').select('id, name').is('deleted_at', null).then(must),
      supabase.from('world_entries').select('id, kind, name').is('deleted_at', null).then(must),
    ])
    return [
      ...(characters as { id: string; name: string }[]).map((c) => ({
        kind: 'character' as const,
        id: c.id,
        name: c.name,
        path: `/c/${campaignId}/characters/${c.id}`,
      })),
      ...(gods as { id: string; name: string; slug: string }[]).map((g) => ({
        kind: 'god' as const,
        id: g.id,
        name: g.name,
        path: `/gods/${g.slug}`,
      })),
      ...(npcs as { id: string; name: string }[]).map((n) => ({
        kind: 'npc' as const,
        id: n.id,
        name: n.name,
        path: `/world/npcs/${n.id}`,
      })),
      ...(entries as { id: string; kind: WorldKind; name: string }[]).map((e) => ({
        kind: e.kind,
        id: e.id,
        name: e.name,
        path: entryPath(e.kind, e.id),
      })),
    ].sort(byName)
  })()
  cache = { key, at: Date.now(), promise }
  promise.catch(() => {
    if (cache?.promise === promise) cache = null
  })
  return promise
}

/**
 * The link targets, loaded only once `wanted` is true (notes with links in
 * them, or an @ typed), so a screen without links reads nothing extra.
 */
export function useLinkTargets(wanted: boolean): LinkTarget[] | null {
  const me = useMe()
  const campaignId = useParams().campaignId ?? me.lastCampaignId
  const [loaded, setLoaded] = useState<{ key: string; targets: LinkTarget[] } | null>(null)
  const key = campaignId ?? ''

  useEffect(() => {
    if (!wanted) return
    let cancelled = false
    loadLinkTargets(campaignId).then(
      (targets) => !cancelled && setLoaded({ key, targets }),
      () => {}, // links then show as plain text
    )
    return () => {
      cancelled = true
    }
  }, [wanted, campaignId, key])

  return loaded?.key === key ? loaded.targets : null
}
