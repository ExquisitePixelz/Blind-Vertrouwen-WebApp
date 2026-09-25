import { useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { ConfirmDialog } from '../components/Dialog'
import { InvitesSection } from '../components/InvitesSection'
import { TopBar } from '../components/TopBar'
import { byName } from '../lib/gods'
import { useMe } from '../lib/me'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Member = { user_id: string; name: string }

/** DM only (ARCHITECTURE.md 1.5): the players in a campaign, and its invite links. */
export function PlayersPage() {
  const me = useMe()
  return me.isDm ? <Players /> : <Navigate to="/" replace />
}

function Players() {
  const { campaignId = '' } = useParams()
  const [removing, setRemoving] = useState<Member | null>(null)

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
    return ids.map((id): Member => ({ user_id: id, name: names.get(id) || 'Unknown player' })).sort(byName)
  }, [campaignId])

  if (campaign.error) {
    return (
      <main className="page">
        <TopBar title="Players" back="/" />
        <p className="error">{campaign.error}</p>
      </main>
    )
  }
  if (!campaign.data) {
    return (
      <main className="page">
        <TopBar title="Players" back="/" />
        {!campaign.loading && <p className="muted">This campaign does not exist.</p>}
      </main>
    )
  }

  return (
    <main className="page">
      <TopBar title="Players" back="/" />

      {members.error && <p className="error">{members.error}</p>}
      {members.data?.length === 0 && <p className="muted">No players yet. Share an invite link below.</p>}
      <ul className="list">
        {members.data?.map((m) => (
          <li key={m.user_id} className="row row-split player-row">
            <span>{m.name}</span>
            <button className="secondary danger-text small-button" onClick={() => setRemoving(m)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <InvitesSection campaignId={campaignId} campaignName={campaign.data.name} />

      {removing && (
        <ConfirmDialog
          title="Remove player"
          message={`${removing.name} loses access to ${campaign.data.name} straight away. If it is their only campaign, they can no longer log in. Their characters stay in the campaign; only you can edit them. To let them back in, send them a new invite link.`}
          confirmLabel="Remove"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            must(
              await supabase.from('campaign_members').delete().eq('campaign_id', campaignId).eq('user_id', removing.user_id),
            )
            await members.reload()
          }}
        />
      )}
    </main>
  )
}
