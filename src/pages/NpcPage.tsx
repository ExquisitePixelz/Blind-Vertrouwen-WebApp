import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ConfirmDialog, PickDialog, PromptDialog } from '../components/Dialog'
import { FactRow } from '../components/FactRow'
import { MarkdownNotes } from '../components/MarkdownNotes'
import { NpcName } from '../components/NpcName'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import { TopBar } from '../components/TopBar'
import { loadCampaigns, type Campaign } from '../lib/campaigns'
import { forgetLinkTargets } from '../lib/linkTargets'
import { useMe } from '../lib/me'
import { NPC_COLUMNS, NPC_STATUSES, npcStatusLabel, type Npc, type NpcStatus } from '../lib/npcs'
import { useRowSaver } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { NAME_MAX } from '../lib/limits'

type Open = 'menu' | 'name' | 'role' | 'status' | 'location' | 'faction' | 'pick-campaign' | 'reveal' | 'delete'

/**
 * One NPC (ARCHITECTURE.md 1.13). A shared wiki: everyone who can see it
 * edits it; taps save at once, the description 1 s after typing stops (3.4).
 * The DM also reveals and deletes it.
 */
export function NpcPage() {
  const me = useMe()
  const { npcId = '' } = useParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open | null>(null)
  const [revealTo, setRevealTo] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const close = () => setOpen(null)
  const list = '/world/npcs'
  const dm = me.isDm

  const npc = useLoad(async () => {
    return must(
      await supabase.from('npcs').select(NPC_COLUMNS).eq('id', npcId).is('deleted_at', null).maybeSingle(),
    ) as Npc | null
  }, [npcId])

  // The DM's reveal state: which campaigns do not see this NPC yet.
  const reveals = useLoad(async () => {
    if (!dm) return null
    const [rows, campaigns] = await Promise.all([
      supabase.from('npc_reveals').select('campaign_id').eq('npc_id', npcId).then(must),
      loadCampaigns(),
    ])
    const revealed = new Set((rows as { campaign_id: string }[]).map((r) => r.campaign_id))
    return { campaigns, hiddenFrom: campaigns.filter((c) => !revealed.has(c.id)) }
  }, [dm, npcId])

  const saver = useRowSaver<Npc>('npcs', npc.data ?? undefined, (saved) => npc.mutate(() => saved))
  const n = saver.view
  const tap = (patch: Partial<Npc>) => saver.change(patch, true)

  if (npc.error) {
    return (
      <main className="page">
        <TopBar back={list} />
        <p className="error">{npc.error}</p>
      </main>
    )
  }
  if (!n) {
    return (
      <main className="page">
        <TopBar back={list} />
        {!npc.loading && <p className="muted">NPC not found. It was deleted, or it is not shared with your campaign.</p>}
      </main>
    )
  }

  const hiddenFrom = reveals.data?.hiddenFrom ?? []
  const current = hiddenFrom.find((c) => c.id === me.lastCampaignId)

  function startReveal() {
    if (hiddenFrom.length === 1) {
      setRevealTo(hiddenFrom[0])
      setOpen('reveal')
    } else setOpen('pick-campaign')
  }

  return (
    <main className="page">
      <TopBar title="NPC" back={list}>
        <button className="icon secondary" aria-label="More" onClick={() => setOpen('menu')}>
          …
        </button>
      </TopBar>
      <p className="page-status">
        <SaveIndicator status={saver.status} />
      </p>
      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(npc.reload)} />
      )}
      {error && <p className="error">{error}</p>}
      {reveals.error && <p className="error">{reveals.error}</p>}

      {dm && current && (
        <div className="notice quest-hidden">
          <span>Hidden: players in {current.name} can’t see this NPC yet.</span>
          <button type="button" className="small-button" onClick={startReveal}>
            Reveal
          </button>
        </div>
      )}

      <h1 className="npc-heading">
        <NpcName npc={n} />
      </h1>

      <div className="card">
        <FactRow label="Role" value={n.role} onClick={() => setOpen('role')} />
        <FactRow label="Status" value={npcStatusLabel(n.status)} onClick={() => setOpen('status')} />
        <FactRow label="Location" value={n.location} onClick={() => setOpen('location')} />
        <FactRow label="Faction" value={n.faction} onClick={() => setOpen('faction')} />
      </div>

      <MarkdownNotes
        title="Description"
        hint={dm ? 'Players who can see this NPC can read and edit this.' : 'Everyone in your campaign can read and edit this.'}
        notes={n.description}
        onChange={(description) => saver.change({ description })}
        onBlur={() => void saver.flush()}
        placeholder="Who they are, what they want, what the party knows…"
        emptyText="No description yet. Tap Edit to write one."
      />

      {open === 'menu' && (
        <PickDialog<Open>
          title={n.name}
          onClose={close}
          onPick={(next) => setTimeout(() => (next === 'reveal' ? startReveal() : setOpen(next)))}
          options={[
            { value: 'name', label: 'Rename' },
            ...(dm && hiddenFrom.length ? [{ value: 'reveal' as const, label: 'Reveal to players' }] : []),
            ...(dm ? [{ value: 'delete' as const, label: 'Delete NPC', className: 'danger-text' }] : []),
          ]}
        />
      )}
      {open === 'name' && (
        <PromptDialog
          title="Name"
          initial={n.name}
          maxLength={NAME_MAX}
          onClose={close}
          onSubmit={(name) => {
            tap({ name })
            forgetLinkTargets()
          }}
        />
      )}
      {open === 'role' && <PromptDialog title="Role" initial={n.role} allowEmpty onClose={close} onSubmit={(role) => tap({ role })} />}
      {open === 'location' && (
        <PromptDialog title="Location" initial={n.location} allowEmpty onClose={close} onSubmit={(location) => tap({ location })} />
      )}
      {open === 'faction' && (
        <PromptDialog title="Faction" initial={n.faction} allowEmpty onClose={close} onSubmit={(faction) => tap({ faction })} />
      )}
      {open === 'status' && (
        <PickDialog<NpcStatus> title="Status" options={NPC_STATUSES} onClose={close} onPick={(status) => tap({ status })} />
      )}
      {open === 'pick-campaign' && (
        <PickDialog<Campaign>
          title="Reveal to which campaign?"
          options={hiddenFrom.map((c) => ({ value: c, label: c.name }))}
          onClose={close}
          onPick={(c) =>
            setTimeout(() => {
              setRevealTo(c)
              setOpen('reveal')
            })
          }
        />
      )}
      {open === 'reveal' && revealTo && (
        <ConfirmDialog
          title="Reveal NPC"
          message={`Players in ${revealTo.name} will see “${n.name}” and can edit it. A revealed NPC can never be hidden again. DM secrets and stats stay yours.`}
          confirmLabel="Reveal"
          onClose={close}
          onConfirm={async () => {
            must(await supabase.from('npc_reveals').insert({ npc_id: n.id, campaign_id: revealTo.id }))
            reveals.reload()
          }}
        />
      )}
      {open === 'delete' && (
        <ConfirmDialog
          title="Delete NPC"
          message={`“${n.name}” will be removed for everyone, with your secrets and stats.`}
          confirmLabel="Delete"
          onClose={close}
          onConfirm={async () => {
            setError(null)
            const { saved } = await saver.settle()
            if (!saved) throw new Error('Your changes are not saved yet. Try again when they are.')
            must(await supabase.rpc('delete_npc', { p_npc_id: n.id }))
            saver.discardMine(() => {})
            forgetLinkTargets()
            navigate(list, { replace: true })
          }}
        />
      )}
    </main>
  )
}
