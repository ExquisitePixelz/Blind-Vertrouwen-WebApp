import { loadCampaigns } from './campaigns'
import { useMe } from './me'
import { must, supabase } from './supabase'
import { useLoad } from './useLoad'

/** Where the reveals of a kind of world content live (1.13, 1.14). */
export type RevealTable = { table: 'npc_reveals'; column: 'npc_id' } | { table: 'world_entry_reveals'; column: 'entry_id' }

/**
 * The DM's reveal state of one NPC or world entry: the campaigns that do not
 * see it yet (and the current one among them), and those that do. Players
 * get nothing.
 */
export function useReveals(where: RevealTable, id: string) {
  const me = useMe()
  const reveals = useLoad(async () => {
    if (!me.isDm) return null
    const [rows, campaigns] = await Promise.all([
      supabase.from(where.table).select('campaign_id').eq(where.column, id).then(must),
      loadCampaigns(),
    ])
    const revealed = new Set((rows as { campaign_id: string }[]).map((r) => r.campaign_id))
    return {
      hiddenFrom: campaigns.filter((c) => !revealed.has(c.id)),
      shownTo: campaigns.filter((c) => revealed.has(c.id)),
    }
  }, [me.isDm, where.table, where.column, id])
  const hiddenFrom = reveals.data?.hiddenFrom ?? []
  return {
    hiddenFrom,
    shownTo: reveals.data?.shownTo ?? [],
    current: hiddenFrom.find((c) => c.id === me.lastCampaignId),
    error: reveals.error,
    reload: reveals.reload,
  }
}
