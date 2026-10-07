import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ConfirmDialog, PickDialog, PromptDialog } from '../components/Dialog'
import { EntryPickDialog } from '../components/EntryPickDialog'
import { FactRow } from '../components/FactRow'
import { MarkdownNotes } from '../components/MarkdownNotes'
import { RevealDialogs } from '../components/Reveal'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import { TopBar } from '../components/TopBar'
import { forgetLinkTargets } from '../lib/linkTargets'
import { useReveals, type RevealTable } from '../lib/reveals'
import { useMe } from '../lib/me'
import { useRowSaver } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import {
  ENTRY_COLUMNS,
  ENTRY_SUMMARY_COLUMNS,
  entryPath,
  kindBySegment,
  partOfOptions,
  placeChain,
  placesInside,
  typeLabel,
  typesFor,
  type EntrySummary,
  type KindInfo,
  type WorldEntry,
} from '../lib/world'
import { NAME_MAX } from '../lib/limits'

type Open = 'menu' | 'name' | 'summary' | 'type' | 'parent' | 'reveal' | 'delete'

const REVEALS: RevealTable = { table: 'world_entry_reveals', column: 'entry_id' }

/** /world/places/:entryId, …: one entry of any kind (ARCHITECTURE.md 1.14). */
export function EntryPage() {
  const { segment, entryId = '' } = useParams()
  const info = kindBySegment(segment)
  return info ? <Entry key={entryId} info={info} entryId={entryId} /> : <Navigate to="/world" replace />
}

/**
 * One place, faction, lore entry, creature or item, like an NPC (1.13): a
 * shared wiki; taps save at once, the description 1 s after typing stops
 * (3.4). The DM also reveals and deletes it.
 */
function Entry({ info, entryId }: { info: KindInfo; entryId: string }) {
  const me = useMe()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open | null>(null)
  const [error, setError] = useState<string | null>(null)
  const close = () => setOpen(null)
  const list = `/world/${info.segment}`
  const dm = me.isDm
  const types = typesFor(info.kind)
  const singular = info.singular.toLowerCase()

  const entry = useLoad(async () => {
    return must(
      await supabase
        .from('world_entries')
        .select(ENTRY_COLUMNS)
        .eq('id', entryId)
        .eq('kind', info.kind)
        .is('deleted_at', null)
        .maybeSingle(),
    ) as WorldEntry | null
  }, [entryId, info.kind])
  const reveals = useReveals(REVEALS, entryId)
  // Places: every place the reader can see, for Part of and Inside.
  const isPlace = info.kind === 'place'
  const places = useLoad(async () => {
    if (!isPlace) return [] as EntrySummary[]
    return must(
      await supabase.from('world_entries').select(ENTRY_SUMMARY_COLUMNS).eq('kind', 'place').is('deleted_at', null),
    ) as EntrySummary[]
  }, [isPlace, entryId])

  const saver = useRowSaver<WorldEntry>('world_entries', entry.data ?? undefined, (saved) => entry.mutate(() => saved))
  const e = saver.view
  const tap = (patch: Partial<WorldEntry>) => saver.change(patch, true)

  if (entry.error) {
    return (
      <main className="page">
        <TopBar back={list} />
        <p className="error">{entry.error}</p>
      </main>
    )
  }
  if (!e) {
    return (
      <main className="page">
        <TopBar back={list} />
        {!entry.loading && (
          <p className="muted">
            {info.singular} not found. It was deleted, or it is not shared with your campaign.
          </p>
        )}
      </main>
    )
  }

  const { hiddenFrom, current } = reveals
  const allPlaces = places.data ?? []
  const parent = e.parent_id ? allPlaces.find((p) => p.id === e.parent_id) : undefined
  const chain = parent ? [parent, ...placeChain(allPlaces, parent.id).filter((p) => p.id !== e.id)] : []
  const inside = isPlace ? placesInside(allPlaces, e.id) : []

  return (
    <main className="page">
      <TopBar title={info.singular} back={list}>
        <button className="icon secondary" aria-label="More" onClick={() => setOpen('menu')}>
          …
        </button>
      </TopBar>
      <p className="page-status">
        <SaveIndicator status={saver.status} />
      </p>
      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(entry.reload)} />
      )}
      {error && <p className="error">{error}</p>}
      {reveals.error && <p className="error">{reveals.error}</p>}

      {dm && current && (
        <div className="notice quest-hidden">
          <span>
            Hidden: players in {current.name} can’t see this {singular} yet.
          </span>
          <button type="button" className="small-button" onClick={() => setOpen('reveal')}>
            Reveal
          </button>
        </div>
      )}

      <h1 className="npc-heading">
        {e.name}
        {e.type && <span className="chip npc-status">{typeLabel(e.kind, e.type)}</span>}
      </h1>
      {chain.length > 0 && (
        <p className="muted entry-chain">
          Part of{' '}
          {chain.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ' · '}
              <Link to={entryPath('place', p.id)}>{p.name}</Link>
            </span>
          ))}
        </p>
      )}

      <div className="card">
        <FactRow label="Summary" value={e.summary} onClick={() => setOpen('summary')} />
        {types.length > 0 && <FactRow label="Type" value={typeLabel(e.kind, e.type)} onClick={() => setOpen('type')} />}
        {isPlace && <FactRow label="Part of" value={parent?.name ?? ''} onClick={() => setOpen('parent')} />}
      </div>

      <MarkdownNotes
        title="Description"
        hint={dm ? `Players who can see this ${singular} can read and edit this.` : 'Everyone in your campaign can read and edit this.'}
        notes={e.description}
        onChange={(description) => saver.change({ description })}
        onBlur={() => void saver.flush()}
        placeholder="What it is, its history, what the party knows…"
        emptyText="No description yet. Tap Edit to write one."
      />

      {inside.length > 0 && (
        <section>
          <h2>Inside</h2>
          <ul className="list">
            {inside.map((p) => (
              <li key={p.id}>
                <Link to={entryPath('place', p.id)} className="row">
                  <strong>{p.name}</strong>
                  {p.type && <span className="chip npc-status">{typeLabel('place', p.type)}</span>}
                  {p.summary && <div>{p.summary}</div>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open === 'menu' && (
        <PickDialog<Open>
          title={e.name}
          onClose={close}
          onPick={(next) => setTimeout(() => setOpen(next))}
          options={[
            { value: 'name', label: 'Rename' },
            ...(dm && hiddenFrom.length ? [{ value: 'reveal' as const, label: 'Reveal to players' }] : []),
            ...(dm ? [{ value: 'delete' as const, label: `Delete ${singular}`, className: 'danger-text' }] : []),
          ]}
        />
      )}
      {open === 'name' && (
        <PromptDialog
          title="Name"
          initial={e.name}
          maxLength={NAME_MAX}
          onClose={close}
          onSubmit={(name) => {
            tap({ name })
            forgetLinkTargets()
          }}
        />
      )}
      {open === 'summary' && (
        <PromptDialog title="Summary" initial={e.summary} allowEmpty onClose={close} onSubmit={(summary) => tap({ summary })} />
      )}
      {open === 'type' && <PickDialog<string> title="Type" options={types} onClose={close} onPick={(type) => tap({ type })} />}
      {open === 'parent' && (
        <EntryPickDialog
          title="Part of"
          options={partOfOptions(allPlaces, e.id)}
          currentId={e.parent_id}
          onClose={close}
          onPick={(p) => tap({ parent_id: p?.id ?? null })}
        />
      )}
      {open === 'reveal' && hiddenFrom.length > 0 && (
        <RevealDialogs where={REVEALS} id={e.id} name={e.name} hiddenFrom={hiddenFrom} onDone={reveals.reload} onClose={close} />
      )}
      {open === 'delete' && (
        <ConfirmDialog
          title={`Delete ${singular}`}
          message={`“${e.name}” will be removed for everyone, with your secrets.`}
          confirmLabel="Delete"
          onClose={close}
          onConfirm={async () => {
            setError(null)
            const { saved } = await saver.settle()
            if (!saved) throw new Error('Your changes are not saved yet. Try again when they are.')
            must(await supabase.rpc('delete_world_entry', { p_entry_id: e.id }))
            saver.discardMine(() => {})
            forgetLinkTargets()
            navigate(list, { replace: true })
          }}
        />
      )}
    </main>
  )
}
