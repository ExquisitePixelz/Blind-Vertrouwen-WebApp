import { useCallback } from 'react'
import { byName } from './gods'
import { useMe, useUpdateMe } from './me'
import { must, supabase } from './supabase'

export type Campaign = { id: string; name: string; subtitle: string }

/** Shown under the campaign name when it has no subtitle of its own (1.5). */
export const DEFAULT_SUBTITLE = 'A Theros campaign'

/** Every campaign this user can open: the DM sees all, players their own. */
export async function loadCampaigns(): Promise<Campaign[]> {
  const rows = must(await supabase.from('campaigns').select('id, name, subtitle').is('deleted_at', null)) as Campaign[]
  return rows.sort(byName)
}

/**
 * Make a campaign the current one: the dashboard opens on it next time, on
 * every device (profiles.last_campaign_id).
 */
export function useRememberCampaign() {
  const me = useMe()
  const update = useUpdateMe()
  return useCallback(
    async (campaignId: string) => {
      if (campaignId === me.lastCampaignId) return
      const result = await supabase.from('profiles').update({ last_campaign_id: campaignId }).eq('id', me.userId)
      // Not a campaign this user is in: leave the remembered one alone.
      if (!result.error) update({ lastCampaignId: campaignId })
    },
    [me.lastCampaignId, me.userId, update],
  )
}

/** DM only: create a campaign in Theros. Returns its id. */
export async function createCampaign(worldId: string | null, name: string): Promise<string> {
  const created = must(await supabase.from('campaigns').insert({ world_id: worldId, name }).select('id').single()) as {
    id: string
  }
  return created.id
}
