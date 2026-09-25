import { useState } from 'react'
import { Dialog, PromptDialog } from '../components/Dialog'
import { FactRow } from '../components/FactRow'
import { TopBar } from '../components/TopBar'
import { signOutWith } from '../lib/access'
import { DEFAULT_SUBTITLE, type Campaign } from '../lib/campaigns'
import { useMe, useUpdateMe } from '../lib/me'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Editing = 'display_name' | 'name' | 'subtitle' | 'delete'

/**
 * Settings (ARCHITECTURE.md 1.5, 1.6): your display name, for the DM the
 * current campaign's name and subtitle, and for players Delete my account.
 * Each saves when OK is tapped.
 */
export function SettingsPage() {
  const me = useMe()
  const updateMe = useUpdateMe()
  const [editing, setEditing] = useState<Editing | null>(null)
  const close = () => setEditing(null)

  const campaign = useLoad(async () => {
    if (!me.isDm || !me.lastCampaignId) return null
    return must(
      await supabase
        .from('campaigns')
        .select('id, name, subtitle')
        .eq('id', me.lastCampaignId)
        .is('deleted_at', null)
        .maybeSingle(),
    ) as Campaign | null
  }, [me.isDm, me.lastCampaignId])
  const c = campaign.data

  async function saveCampaign(patch: Partial<Campaign>) {
    const saved = must(
      await supabase.from('campaigns').update(patch).eq('id', c!.id).select('id, name, subtitle').single(),
    ) as Campaign
    campaign.mutate(() => saved)
  }

  return (
    <main className="page">
      <TopBar title="Settings" back="/" />

      <h2>You</h2>
      <div className="card">
        <FactRow label="Display name" value={me.name} onClick={() => setEditing('display_name')} />
      </div>
      <p className="muted small">Shown to the DM and the other players instead of your Google name.</p>

      {c && (
        <>
          <h2>Campaign</h2>
          <div className="card">
            <FactRow label="Name" value={c.name} onClick={() => setEditing('name')} />
            <FactRow
              label="Subtitle"
              value={c.subtitle || DEFAULT_SUBTITLE}
              muted={!c.subtitle}
              onClick={() => setEditing('subtitle')}
            />
          </div>
          <p className="muted small">Shown on the dashboard. Switch campaign from the account menu to edit another.</p>
        </>
      )}
      {campaign.error && <p className="error">{campaign.error}</p>}

      {!me.isDm && (
        <>
          <h2>Account</h2>
          <button className="secondary danger-text" onClick={() => setEditing('delete')}>
            Delete my account
          </button>
        </>
      )}

      {editing === 'display_name' && (
        <PromptDialog
          title="Display name"
          initial={me.name}
          onClose={close}
          onSubmit={async (display_name) => {
            must(await supabase.from('profiles').update({ display_name }).eq('id', me.userId).select('id').single())
            updateMe({ name: display_name })
          }}
        />
      )}
      {editing === 'name' && c && (
        <PromptDialog title="Campaign name" initial={c.name} onClose={close} onSubmit={(name) => saveCampaign({ name })} />
      )}
      {editing === 'subtitle' && c && (
        <PromptDialog
          title="Subtitle"
          initial={c.subtitle}
          allowEmpty
          onClose={close}
          onSubmit={(subtitle) => saveCampaign({ subtitle })}
        />
      )}
      {editing === 'delete' && <DeleteAccountDialog onClose={close} />}
    </main>
  )
}

const CONFIRM_WORD = 'DELETE'

/**
 * Deleting your account is permanent (1.6), so it takes two steps: read the
 * warning, then type DELETE.
 */
function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD && !busy

  return (
    <Dialog title="Delete your account?" onClose={onClose}>
      <p>
        <strong className="error">This is permanent and cannot be undone, not even by the DM.</strong>
      </p>
      <p>
        Your account, your characters and their piety are deleted, and you leave every campaign. To play again, you
        need a new invite link and must start over.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!ready) return
          setBusy(true)
          setError(null)
          const result = await supabase.rpc('delete_my_account')
          if (result.error) {
            setError(result.error.message)
            setBusy(false)
            return
          }
          await signOutWith('Your account has been deleted.')
        }}
      >
        <label className="field">
          <span className="muted small">Type {CONFIRM_WORD} to confirm</span>
          <input
            className="text-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="danger" disabled={!ready}>
            Delete forever
          </button>
        </div>
      </form>
    </Dialog>
  )
}
