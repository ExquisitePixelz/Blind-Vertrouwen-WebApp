import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { PromptDialog } from '../components/Dialog'
import { TopBar } from '../components/TopBar'
import { createCampaign, DEFAULT_SUBTITLE, loadCampaigns, useRememberCampaign, type Campaign } from '../lib/campaigns'
import { useMe } from '../lib/me'
import { useNewSession } from '../lib/sessions'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

/**
 * The home page (ARCHITECTURE.md 1.5). Opens on the last campaign chosen on
 * this account. If none is remembered: with exactly one campaign, open it;
 * otherwise show the campaign picker.
 */
export function DashboardPage() {
  const me = useMe()
  const remember = useRememberCampaign()
  const campaigns = useLoad(loadCampaigns, [])
  const list = campaigns.data
  const chosen = list?.find((c) => c.id === me.lastCampaignId) ?? (list?.length === 1 ? list[0] : undefined)
  const chosenId = chosen?.id

  useEffect(() => {
    if (chosenId) void remember(chosenId)
  }, [chosenId, remember])

  if (campaigns.error) {
    return (
      <main className="page">
        <TopBar />
        <p className="error">{campaigns.error}</p>
      </main>
    )
  }
  if (!list) {
    return (
      <main className="page">
        <TopBar />
      </main>
    )
  }
  return chosen ? <Dashboard campaign={chosen} /> : <CampaignPicker campaigns={list} />
}

function Dashboard({ campaign }: { campaign: Campaign }) {
  const me = useMe()
  const newSession = useNewSession(campaign.id)
  const base = `/c/${campaign.id}`
  // "Last session: #n" (1.3 D5), DM only.
  const last = useLoad(async () => {
    if (!me.isDm) return null
    const rows = must(
      await supabase
        .from('sessions')
        .select('number')
        .eq('campaign_id', campaign.id)
        .is('deleted_at', null)
        .order('number', { ascending: false })
        .limit(1),
    ) as { number: number }[]
    return rows[0]?.number ?? 0
  }, [me.isDm, campaign.id])
  return (
    <main className="page dashboard">
      <TopBar />
      <div className="dash-head">
        <h1 className="dash-title">{campaign.name}</h1>
        <p className="muted">{campaign.subtitle || DEFAULT_SUBTITLE}</p>
      </div>
      <nav className="dash-buttons">
        {me.isDm && (
          <>
            <button type="button" className="dash-button primary" onClick={() => void newSession.start()}>
              Create Session
            </button>
            <Link className="dash-button" to={`${base}/sessions`}>
              Sessions
            </Link>
          </>
        )}
        <Link className="dash-button" to={`${base}/piety`}>
          Piety Scores
        </Link>
        <Link className="dash-button" to={`${base}/characters`}>
          Characters
        </Link>
        <Link className="dash-button" to="/gods">
          Gods
        </Link>
        {me.isDm && (
          <Link className="dash-button" to={`${base}/players`}>
            Players
          </Link>
        )}
      </nav>
      {me.isDm && typeof last.data === 'number' && (
        <p className="muted dash-last">{last.data ? `Last session: #${last.data}` : 'No sessions yet'}</p>
      )}
      {newSession.error && <p className="error">{newSession.error}</p>}
      {newSession.dialog}
    </main>
  )
}

function CampaignPicker({ campaigns }: { campaigns: Campaign[] }) {
  const me = useMe()
  const remember = useRememberCampaign()
  const [creating, setCreating] = useState(false)

  return (
    <main className="page">
      <TopBar title="Campaigns">
        {me.isDm && (
          <button className="icon" aria-label="New campaign" onClick={() => setCreating(true)}>
            +
          </button>
        )}
      </TopBar>

      {campaigns.length === 0 && (
        <p className="muted">
          {me.isDm
            ? 'No campaigns yet. Tap + to create one.'
            : 'You are not in a campaign yet. Ask the DM for an invite link.'}
        </p>
      )}
      <ul className="list">
        {campaigns.map((c) => (
          <li key={c.id}>
            <button type="button" className="row row-button" onClick={() => void remember(c.id)}>
              <strong>{c.name}</strong>
              <div className="muted small">{c.subtitle || DEFAULT_SUBTITLE}</div>
            </button>
          </li>
        ))}
      </ul>

      {creating && (
        <PromptDialog
          title="New campaign"
          submitLabel="Create"
          onClose={() => setCreating(false)}
          onSubmit={async (name) => remember(await createCampaign(me.worldId, name))}
        />
      )}
    </main>
  )
}

/** /c/:campaignId (e.g. after joining with an invite): make it the current campaign, then show the dashboard. */
export function OpenCampaign() {
  const { campaignId = '' } = useParams()
  const remember = useRememberCampaign()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    remember(campaignId).finally(() => !cancelled && navigate('/', { replace: true }))
    return () => {
      cancelled = true
    }
    // Once per campaign id; `remember` changes when it succeeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  return (
    <main className="page">
      <TopBar />
    </main>
  )
}
