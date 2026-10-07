import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { PromptDialog } from '../components/Dialog'
import { TopBar } from '../components/TopBar'
import { forgetLinkTargets } from '../lib/linkTargets'
import { useMe } from '../lib/me'
import { groupNpcs } from '../lib/npcs'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import {
  ENTRY_SUMMARY_COLUMNS,
  entryPath,
  filterEntries,
  kindBySegment,
  typeLabel,
  typesFor,
  type EntrySummary,
  type KindInfo,
} from '../lib/world'
import { NAME_MAX } from '../lib/limits'

/** /world/places, /world/factions, …: the list of one kind (ARCHITECTURE.md 1.14). */
export function EntriesPage() {
  const info = kindBySegment(useParams().segment)
  return info ? <EntryList key={info.kind} info={info} /> : <Navigate to="/world" replace />
}

/**
 * One kind's library, like the NPC list (1.13): players see what is revealed
 * to their campaigns; the DM sees all, with a Hidden group for what the
 * current campaign does not see. Everyone adds entries.
 */
function EntryList({ info }: { info: KindInfo }) {
  const me = useMe()
  const navigate = useNavigate()
  const campaignId = me.lastCampaignId
  const [filter, setFilter] = useState('')
  const [type, setType] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const types = typesFor(info.kind)

  const data = useLoad(async () => {
    const [entries, reveals] = await Promise.all([
      supabase.from('world_entries').select(ENTRY_SUMMARY_COLUMNS).eq('kind', info.kind).is('deleted_at', null).then(must),
      me.isDm && campaignId
        ? supabase.from('world_entry_reveals').select('entry_id').eq('campaign_id', campaignId).then(must)
        : Promise.resolve(null),
    ])
    const revealed = reveals ? new Set((reveals as { entry_id: string }[]).map((r) => r.entry_id)) : null
    return { entries: entries as EntrySummary[], revealed }
  }, [info.kind, me.isDm, campaignId])

  const all = data.data?.entries ?? []
  const byId = new Map(all.map((e) => [e.id, e]))
  const { hidden, shown } = groupNpcs(filterEntries(all, filter, type), data.data?.revealed ?? null)
  const lower = info.plural.toLowerCase()

  const rows = (list: EntrySummary[]) => (
    <ul className="list">
      {list.map((entry) => {
        const parent = entry.parent_id ? byId.get(entry.parent_id) : undefined
        return (
          <li key={entry.id}>
            <Link to={entryPath(entry.kind, entry.id)} className="row">
              <strong>{entry.name}</strong>
              {entry.type && <span className="chip npc-status">{typeLabel(entry.kind, entry.type)}</span>}
              {entry.summary && <div>{entry.summary}</div>}
              {parent && <div className="muted small">In {parent.name}</div>}
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <main className="page">
      <TopBar title={info.plural} back="/world">
        {campaignId && (
          <button className="icon" aria-label={`New ${info.singular.toLowerCase()}`} onClick={() => setAdding(true)}>
            +
          </button>
        )}
      </TopBar>

      {data.error && <p className="error">{data.error}</p>}
      {data.data && all.length === 0 && <p className="muted">No {lower} yet. Tap + to add one.</p>}
      {all.length > 0 && (
        <input
          type="search"
          className="text-input npc-filter"
          placeholder="Filter by name or summary"
          aria-label={`Filter ${lower}`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      {all.length > 0 && types.length > 0 && (
        <div className="type-chips" role="group" aria-label="Type">
          {[{ value: null, label: 'All' }, ...types].map((t) => (
            <button
              key={t.label}
              type="button"
              className={`chip-button${type === t.value ? ' on' : ''}`}
              aria-pressed={type === t.value}
              onClick={() => setType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {all.length > 0 && !hidden.length && !shown.length && <p className="muted">Nothing matches.</p>}

      {!!hidden.length && (
        <section>
          <h2>Hidden ({hidden.length}): players can’t see these yet</h2>
          {rows(hidden)}
        </section>
      )}
      {!!shown.length &&
        (hidden.length ? (
          <section>
            <h2>Revealed ({shown.length})</h2>
            {rows(shown)}
          </section>
        ) : (
          rows(shown)
        ))}

      {adding && campaignId && (
        <PromptDialog
          title={`New ${info.singular.toLowerCase()}`}
          submitLabel="Create"
          maxLength={NAME_MAX}
          onClose={() => setAdding(false)}
          onSubmit={async (name) => {
            const entry = must(
              await supabase.rpc('create_world_entry', { p_campaign_id: campaignId, p_kind: info.kind, p_name: name }),
            ) as { id: string }
            forgetLinkTargets()
            navigate(entryPath(info.kind, entry.id))
          }}
        />
      )}
    </main>
  )
}
