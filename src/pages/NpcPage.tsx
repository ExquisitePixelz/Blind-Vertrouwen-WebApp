import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDialog, PickDialog, PromptDialog } from '../components/Dialog'
import { EntryPickDialog } from '../components/EntryPickDialog'
import { FactRow } from '../components/FactRow'
import { MarkdownNotes } from '../components/MarkdownNotes'
import { NpcName } from '../components/NpcName'
import { SecretsSection } from '../components/Secrets'
import { HideDialogs, RevealDialogs } from '../components/Reveal'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import { TopBar } from '../components/TopBar'
import { forgetLinkTargets } from '../lib/linkTargets'
import { useReveals, type RevealTable } from '../lib/reveals'
import { useMe } from '../lib/me'
import { NPC_COLUMNS, NPC_STATUSES, npcStatusLabel, type Npc, type NpcStatus } from '../lib/npcs'
import { useRowSaver, worstStatus, type SaveStatus } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { entryPath, type WorldKind } from '../lib/world'
import { NAME_MAX } from '../lib/limits'

type Open = 'menu' | 'name' | 'role' | 'status' | 'location' | 'faction' | 'reveal' | 'hide' | 'delete'

const REVEALS: RevealTable = { table: 'npc_reveals', column: 'npc_id' }
const SECRETS = { table: 'npc_secrets', column: 'npc_id' } as const

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
  const [error, setError] = useState<string | null>(null)
  const [secretsStatus, setSecretsStatus] = useState<SaveStatus>('saved')
  const close = () => setOpen(null)
  const list = '/world/npcs'
  const dm = me.isDm

  const npc = useLoad(async () => {
    return must(
      await supabase.from('npcs').select(NPC_COLUMNS).eq('id', npcId).is('deleted_at', null).maybeSingle(),
    ) as Npc | null
  }, [npcId])

  // The DM's reveal state: which campaigns do not see this NPC yet.
  const reveals = useReveals(REVEALS, npcId)

  // The places and factions the user can see, for Location and Faction (1.14).
  const entries = useLoad(async () => {
    return must(
      await supabase.from('world_entries').select('id, kind, name').in('kind', ['place', 'faction']).is('deleted_at', null),
    ) as { id: string; kind: WorldKind; name: string }[]
  }, [])

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

  const { hiddenFrom, shownTo, current } = reveals
  const all = entries.data ?? []
  const sorted = (kind: WorldKind) => all.filter((x) => x.kind === kind).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  const place = n.place_id ? all.find((x) => x.id === n.place_id) : undefined
  const faction = n.faction_id ? all.find((x) => x.id === n.faction_id) : undefined
  /** A player sees [hidden] for a picked place or faction they cannot see, never its name (owner, 2026-10-08). */
  const shownName = (id: string | null, found: unknown, name: string) =>
    dm || !id || found ? name : entries.data ? '[hidden]' : '…'

  /** Create a place or faction from the picker: a player's is revealed to their campaign at once (1.14). */
  async function createEntry(kind: WorldKind, name: string) {
    if (!me.lastCampaignId) throw new Error('Open a campaign first.')
    const created = must(
      await supabase.rpc('create_world_entry', { p_campaign_id: me.lastCampaignId, p_kind: kind, p_name: name }),
    ) as { id: string; kind: WorldKind; name: string }
    entries.mutate((list) => [...(list ?? []), created])
    forgetLinkTargets()
    return created
  }

  return (
    <main className="page">
      <TopBar title="NPC" back={list}>
        <button className="icon secondary" aria-label="More" onClick={() => setOpen('menu')}>
          …
        </button>
      </TopBar>
      <p className="page-status">
        <SaveIndicator status={dm ? worstStatus(saver.status, secretsStatus) : saver.status} />
      </p>
      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(npc.reload)} />
      )}
      {error && <p className="error">{error}</p>}
      {reveals.error && <p className="error">{reveals.error}</p>}

      {dm && current && (
        <div className="notice quest-hidden">
          <span>Hidden: players in {current.name} can’t see this NPC yet.</span>
          <button type="button" className="small-button" onClick={() => setOpen('reveal')}>
            Reveal
          </button>
        </div>
      )}

      <h1 className="npc-heading">
        <NpcName npc={n} />
      </h1>
      {(place || faction) && (
        <p className="muted entry-chain">
          {place && (
            <>
              At <Link to={entryPath('place', place.id)}>{place.name}</Link>
            </>
          )}
          {place && faction && ' · '}
          {faction && <Link to={entryPath('faction', faction.id)}>{faction.name}</Link>}
        </p>
      )}

      <div className="card">
        <FactRow label="Role" value={n.role} onClick={() => setOpen('role')} />
        <FactRow label="Status" value={npcStatusLabel(n.status)} onClick={() => setOpen('status')} />
        <FactRow label="Location" value={shownName(n.place_id, place, n.location)} onClick={() => setOpen('location')} />
        <FactRow label="Faction" value={shownName(n.faction_id, faction, n.faction)} onClick={() => setOpen('faction')} />
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

      {dm && <SecretsSection where={SECRETS} id={n.id} stats onStatus={setSecretsStatus} />}

      {open === 'menu' && (
        <PickDialog<Open>
          title={n.name}
          onClose={close}
          onPick={(next) => setTimeout(() => setOpen(next))}
          options={[
            { value: 'name', label: 'Rename' },
            ...(dm && hiddenFrom.length ? [{ value: 'reveal' as const, label: 'Reveal to players' }] : []),
            ...(dm && shownTo.length ? [{ value: 'hide' as const, label: 'Hide again' }] : []),
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
        <EntryPickDialog
          title="Location"
          options={sorted('place')}
          currentId={n.place_id ?? (n.location ? '' : null)}
          onClose={close}
          onPick={(p) => tap({ place_id: p?.id ?? null, location: p?.name ?? '' })}
          onCreate={(name) => createEntry('place', name)}
        />
      )}
      {open === 'faction' && (
        <EntryPickDialog
          title="Faction"
          options={sorted('faction')}
          currentId={n.faction_id ?? (n.faction ? '' : null)}
          onClose={close}
          onPick={(f) => tap({ faction_id: f?.id ?? null, faction: f?.name ?? '' })}
          onCreate={(name) => createEntry('faction', name)}
        />
      )}
      {open === 'status' && (
        <PickDialog<NpcStatus> title="Status" options={NPC_STATUSES} onClose={close} onPick={(status) => tap({ status })} />
      )}
      {open === 'reveal' && hiddenFrom.length > 0 && (
        <RevealDialogs where={REVEALS} id={n.id} name={n.name} hiddenFrom={hiddenFrom} onDone={reveals.reload} onClose={close} />
      )}
      {open === 'hide' && shownTo.length > 0 && (
        <HideDialogs where={REVEALS} id={n.id} name={n.name} shownTo={shownTo} onDone={reveals.reload} onClose={close} />
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
