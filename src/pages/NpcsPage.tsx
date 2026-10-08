import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PromptDialog } from '../components/Dialog'
import { NpcName } from '../components/NpcName'
import { TopBar } from '../components/TopBar'
import { forgetLinkTargets } from '../lib/linkTargets'
import { useMe } from '../lib/me'
import { NPC_SUMMARY_COLUMNS, filterNpcs, groupNpcs, maskHiddenPicks, npcPlace, type NpcSummary } from '../lib/npcs'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { NAME_MAX } from '../lib/limits'

/**
 * The NPC library (ARCHITECTURE.md 1.13). Players see the NPCs revealed to
 * their campaigns; the DM sees all, with a Hidden group for those not
 * revealed to the current campaign. Everyone adds NPCs.
 */
export function NpcsPage() {
  const me = useMe()
  const navigate = useNavigate()
  const campaignId = me.lastCampaignId
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)

  const data = useLoad(async () => {
    const [npcs, reveals, entries] = await Promise.all([
      supabase.from('npcs').select(NPC_SUMMARY_COLUMNS).is('deleted_at', null).then(must),
      me.isDm && campaignId
        ? supabase.from('npc_reveals').select('npc_id').eq('campaign_id', campaignId).then(must)
        : Promise.resolve(null),
      // A player's visible places and factions, so hidden ones show as [hidden].
      me.isDm
        ? Promise.resolve(null)
        : supabase.from('world_entries').select('id').in('kind', ['place', 'faction']).is('deleted_at', null).then(must),
    ])
    const revealed = reveals ? new Set((reveals as { npc_id: string }[]).map((r) => r.npc_id)) : null
    const visible = entries && new Set((entries as { id: string }[]).map((e) => e.id))
    const list = npcs as NpcSummary[]
    return { npcs: visible ? list.map((n) => maskHiddenPicks(n, visible)) : list, revealed }
  }, [me.isDm, campaignId])

  const all = data.data?.npcs ?? []
  const { hidden, shown } = groupNpcs(filterNpcs(all, filter), data.data?.revealed ?? null)

  const rows = (list: NpcSummary[]) => (
    <ul className="list">
      {list.map((npc) => {
        const place = npcPlace(npc)
        return (
          <li key={npc.id}>
            <Link to={`/world/npcs/${npc.id}`} className="row">
              <strong>
                <NpcName npc={npc} />
              </strong>
              {npc.role && <div>{npc.role}</div>}
              {place && <div className="muted small">{place}</div>}
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <main className="page">
      <TopBar title="NPCs" back="/world">
        {campaignId && (
          <button className="icon" aria-label="New NPC" onClick={() => setAdding(true)}>
            +
          </button>
        )}
      </TopBar>

      {data.error && <p className="error">{data.error}</p>}
      {data.data && all.length === 0 && <p className="muted">No NPCs yet. Tap + to add one.</p>}
      {all.length > 0 && (
        <input
          type="search"
          className="text-input npc-filter"
          placeholder="Filter by name, role, place or faction"
          aria-label="Filter NPCs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      {all.length > 0 && !hidden.length && !shown.length && <p className="muted">No NPC matches “{filter.trim()}”.</p>}

      {!!hidden.length && (
        <section>
          <h2>Hidden ({hidden.length}): players can’t see these yet</h2>
          {rows(hidden)}
        </section>
      )}
      {!!shown.length && (hidden.length ? (
        <section>
          <h2>Revealed ({shown.length})</h2>
          {rows(shown)}
        </section>
      ) : (
        rows(shown)
      ))}

      {adding && campaignId && (
        <PromptDialog
          title="New NPC"
          submitLabel="Create"
          maxLength={NAME_MAX}
          onClose={() => setAdding(false)}
          onSubmit={async (name) => {
            const npc = must(await supabase.rpc('create_npc', { p_campaign_id: campaignId, p_name: name })) as { id: string }
            forgetLinkTargets()
            navigate(`/world/npcs/${npc.id}`)
          }}
        />
      )}
    </main>
  )
}
