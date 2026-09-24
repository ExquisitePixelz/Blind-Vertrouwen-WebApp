import { useEffect } from 'react'
import { useParams } from 'react-router'
import { CharactersSection } from '../components/CharactersSection'
import { InvitesSection } from '../components/InvitesSection'
import { TopBar } from '../components/TopBar'
import { useRememberCampaign } from '../lib/campaigns'
import { useMe } from '../lib/me'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Member = { user_id: string; name: string }

export function CampaignPage() {
  const { campaignId = '' } = useParams()
  const me = useMe()
  const remember = useRememberCampaign()

  const campaign = useLoad(async () => {
    const found = must(
      await supabase.from('campaigns').select('id, name').eq('id', campaignId).is('deleted_at', null).maybeSingle(),
    )
    return found as { id: string; name: string } | null
  }, [campaignId])

  const members = useLoad(async () => {
    const rows = must(
      await supabase.from('campaign_members').select('user_id').eq('campaign_id', campaignId),
    ) as { user_id: string }[]
    const ids = rows.map((r) => r.user_id)
    const profiles = ids.length
      ? (must(await supabase.from('profiles').select('id, display_name').in('id', ids)) as {
          id: string
          display_name: string
        }[])
      : []
    const names = new Map(profiles.map((p) => [p.id, p.display_name]))
    return ids
      .map((id): Member => ({ user_id: id, name: names.get(id) || 'Unknown player' }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [campaignId])

  const found = !!campaign.data
  useEffect(() => {
    if (found) void remember(campaignId)
  }, [found, campaignId, remember])

  if (campaign.error) return (
      <main className="page">
        <TopBar back="/" />
        <p className="error">{campaign.error}</p>
      </main>
    )
  if (campaign.loading && !campaign.data) return (
      <main className="page">
        <TopBar back="/" />
      </main>
    )
  if (!campaign.data) {
    return (
      <main className="page">
        <TopBar back="/" />
        <p className="muted">This campaign does not exist, or you are not in it.</p>
      </main>
    )
  }

  return (
    <main className="page">
      <TopBar title={campaign.data.name} back="/" />

      <CharactersSection campaignId={campaignId} />

      <section>
        <h2>Players</h2>
        {members.data?.length === 0 && <p className="muted">No players yet.</p>}
        <ul className="list">
          {members.data?.map((m) => (
            <li key={m.user_id} className="row">
              {m.name}
              {m.user_id === me.userId && <span className="muted"> (you)</span>}
            </li>
          ))}
        </ul>
      </section>

      {me.isDm && <InvitesSection campaignId={campaignId} campaignName={campaign.data.name} />}
    </main>
  )
}
