import { useState } from 'react'
import { PromptDialog } from '../components/Dialog'
import { FactRow } from '../components/FactRow'
import { TopBar } from '../components/TopBar'
import { DEFAULT_SUBTITLE, type Campaign } from '../lib/campaigns'
import { useMe, useUpdateMe } from '../lib/me'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Editing = 'display_name' | 'name' | 'subtitle'

/**
 * Settings (ARCHITECTURE.md 1.5): your display name, and for the DM the
 * current campaign's name and subtitle. Each saves when OK is tapped.
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
    </main>
  )
}
