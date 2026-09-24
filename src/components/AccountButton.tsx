import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PickDialog, PromptDialog } from './Dialog'
import { createCampaign, loadCampaigns, useRememberCampaign } from '../lib/campaigns'
import { useMe } from '../lib/me'
import { supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Mode = 'menu' | 'switch' | 'create'

/**
 * The account button (ARCHITECTURE.md 1.5): the user's name, or their initial
 * on narrow screens. It opens a small menu with the current campaign,
 * Switch campaign, Settings and Log out.
 */
export function AccountButton() {
  const me = useMe()
  const [mode, setMode] = useState<Mode | null>(null)
  const initial = me.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <span className="account">
      <button
        type="button"
        className="account-button"
        aria-haspopup="menu"
        aria-expanded={mode === 'menu'}
        aria-label={`Account: ${me.name}`}
        onClick={() => setMode((m) => (m === 'menu' ? null : 'menu'))}
      >
        <span className="account-initial" aria-hidden="true">
          {initial}
        </span>
        <span className="account-name" aria-hidden="true">
          {me.name}
        </span>
      </button>
      {mode && <AccountMenu mode={mode} setMode={setMode} />}
    </span>
  )
}

/** Mounted only while open, so campaigns load when the menu is used, not on every screen. */
function AccountMenu({ mode, setMode }: { mode: Mode; setMode: (mode: Mode | null) => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const remember = useRememberCampaign()
  const campaigns = useLoad(loadCampaigns, [])
  const current = campaigns.data?.find((c) => c.id === me.lastCampaignId)
  const close = () => setMode(null)

  useEffect(() => {
    if (mode !== 'menu') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMode(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, setMode])

  async function open(campaignId: string) {
    await remember(campaignId)
    navigate('/')
  }

  if (mode === 'switch') {
    const NEW = 'new'
    return (
      <PickDialog<string>
        title="Switch campaign"
        onClose={close}
        onPick={(id) => (id === NEW ? setTimeout(() => setMode('create')) : void open(id))}
        options={[
          ...(campaigns.data ?? []).map((c) => ({
            value: c.id,
            label: c.id === me.lastCampaignId ? `${c.name}  •` : c.name,
          })),
          ...(me.isDm ? [{ value: NEW, label: 'New campaign…', className: 'gold' }] : []),
        ]}
      />
    )
  }

  if (mode === 'create') {
    return (
      <PromptDialog
        title="New campaign"
        submitLabel="Create"
        onClose={close}
        onSubmit={async (name) => open(await createCampaign(me.worldId, name))}
      />
    )
  }

  return (
    <>
      <div className="popover-backdrop" onClick={close} />
      <div className="popover" role="menu">
        <div className="popover-head">
          <span className="popover-user">
            <strong>{me.name}</strong>
            {me.isDm && <span className="chip gold">DM</span>}
          </span>
          <span className="muted small">{campaigns.data ? (current?.name ?? 'No campaign chosen') : ' '}</span>
        </div>
        <button type="button" role="menuitem" className="popover-item" onClick={() => setMode('switch')}>
          Switch campaign
        </button>
        <Link to="/settings" role="menuitem" className="popover-item" onClick={close}>
          Settings
        </Link>
        <button type="button" role="menuitem" className="popover-item" onClick={() => supabase.auth.signOut()}>
          Log out
        </button>
      </div>
    </>
  )
}
