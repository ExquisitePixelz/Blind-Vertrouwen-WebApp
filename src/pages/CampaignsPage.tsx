import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PromptDialog } from '../components/Dialog'
import { useMe } from '../lib/me'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Campaign = { id: string; name: string }

export function CampaignsPage() {
  const me = useMe()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const campaigns = useLoad(
    async () =>
      must(await supabase.from('campaigns').select('id, name').is('deleted_at', null).order('name')) as Campaign[],
    [],
  )

  return (
    <main className="page">
      <div className="title-row">
        <h1>Campaigns</h1>
        {me.isDm && (
          <button className="icon" aria-label="New campaign" onClick={() => setCreating(true)}>
            +
          </button>
        )}
      </div>

      {campaigns.error && <p className="error">{campaigns.error}</p>}
      {campaigns.data?.length === 0 && (
        <p className="muted">
          {me.isDm
            ? 'No campaigns yet. Tap + to create one.'
            : 'You are not in a campaign yet. Ask the DM for an invite link.'}
        </p>
      )}
      <ul className="list">
        {campaigns.data?.map((c) => (
          <li key={c.id}>
            <Link to={`/c/${c.id}`} className="row">
              <strong>{c.name}</strong>
            </Link>
          </li>
        ))}
      </ul>

      {creating && (
        <PromptDialog
          title="New campaign"
          submitLabel="Create"
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            const created = must(
              await supabase.from('campaigns').insert({ world_id: me.worldId, name }).select('id').single(),
            ) as { id: string }
            navigate(`/c/${created.id}`)
          }}
        />
      )}
    </main>
  )
}
