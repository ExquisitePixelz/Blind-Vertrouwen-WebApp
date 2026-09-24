import { useState } from 'react'
import { useParams } from 'react-router'
import { PromptDialog } from '../components/Dialog'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import { StandingBar } from '../components/StandingBar'
import { byName, loadGods, loadRelationships, type God, type Relationship } from '../lib/gods'
import { useMe } from '../lib/me'
import { useRowSaver } from '../lib/saver'
import { NEUTRAL, standing } from '../lib/standing'
import { supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type TextField = 'name' | 'epithet' | 'alignment' | 'domains' | 'symbol'

const FACTS: { field: TextField; label: string }[] = [
  { field: 'epithet', label: 'Title' },
  { field: 'alignment', label: 'Alignment' },
  { field: 'domains', label: 'Domains' },
  { field: 'symbol', label: 'Symbol' },
]

/** God page (1.3 C5). Players read everything (C6); only the DM edits. */
export function GodPage() {
  const { slug = '' } = useParams()
  const me = useMe()
  const canEdit = me.isDm
  const gods = useLoad(loadGods, [])
  const relationships = useLoad(loadRelationships, [])
  const [editing, setEditing] = useState<{ field: TextField; label: string } | null>(null)
  const [relError, setRelError] = useState<string | null>(null)

  const loaded = gods.data?.find((g) => g.slug === slug)
  const saver = useRowSaver<God>('gods', loaded, (saved) =>
    gods.mutate((list) => list?.map((g) => (g.id === saved.id ? saved : g))),
  )
  const god = saver.view

  if (gods.error) return <main className="page error">{gods.error}</main>
  if (!gods.data) return <main className="page" />
  if (!god) {
    return (
      <main className="page">
        <p className="muted">This god does not exist, or you cannot see it.</p>
      </main>
    )
  }

  const rels = relationships.data ?? []
  const valueOf = (from: string, to: string) =>
    rels.find((r) => r.from_god_id === from && r.to_god_id === to)?.value ?? NEUTRAL
  const others = gods.data.filter((g) => g.id !== god.id).sort(byName)
  const seenBy = others
    .map((other) => ({ other, value: valueOf(other.id, god.id) }))
    .filter((x) => x.value !== NEUTRAL)
    .sort((a, b) => a.value - b.value || byName(a.other, b.other))

  /** Set value(this → other). Neutral is stored as "no row" (1.3 C3). */
  async function setRelationship(other: God, value: number) {
    const before = rels
    const next: Relationship[] = rels.filter((r) => !(r.from_god_id === god!.id && r.to_god_id === other.id))
    if (value !== NEUTRAL) next.push({ from_god_id: god!.id, to_god_id: other.id, value })
    relationships.mutate(() => next)
    setRelError(null)
    const result =
      value === NEUTRAL
        ? await supabase.from('god_relationships').delete().eq('from_god_id', god!.id).eq('to_god_id', other.id)
        : await supabase
            .from('god_relationships')
            .upsert({ from_god_id: god!.id, to_god_id: other.id, value }, { onConflict: 'from_god_id,to_god_id' })
    if (result.error) {
      relationships.mutate(() => before)
      setRelError(`Could not save how ${god!.name} sees ${other.name}: ${result.error.message}`)
    }
  }

  return (
    <main className="page">
      <div className="title-row">
        <h1>{god.name}</h1>
        {canEdit && <SaveIndicator status={saver.status} />}
      </div>

      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(gods.reload)} />
      )}

      <div className="card">
        {canEdit && (
          <FactRow label="Name" value={god.name} onClick={() => setEditing({ field: 'name', label: 'Name' })} />
        )}
        {FACTS.map(({ field, label }) => (
          <FactRow
            key={field}
            label={label}
            value={god[field]}
            onClick={canEdit ? () => setEditing({ field, label }) : undefined}
          />
        ))}
      </div>

      <h2>Attitude toward the party</h2>
      <StandingBar
        label="The party"
        value={god.party_attitude}
        onChange={canEdit ? (value) => saver.change({ party_attitude: value }, true) : undefined}
      />

      <h2>How {god.name} sees others</h2>
      {relError && <p className="error">{relError}</p>}
      {others.map((other) => (
        <StandingBar
          key={other.id}
          label={other.name}
          value={valueOf(god.id, other.id)}
          onChange={canEdit ? (value) => setRelationship(other, value) : undefined}
        />
      ))}

      <h2>How others see {god.name}</h2>
      {seenBy.length === 0 ? (
        <p className="muted">Every god is neutral toward {god.name}.</p>
      ) : (
        <ul className="list">
          {seenBy.map(({ other, value }) => {
            const s = standing(value)
            return (
              <li key={other.id} className="row seen-by">
                <span>{other.name}</span>
                <span className="chip" style={{ color: s.text }}>
                  {s.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <h2>Notes</h2>
      {canEdit ? (
        <textarea
          className="text-input notes"
          value={god.notes}
          placeholder={`Your notes on ${god.name}… Players can read these.`}
          onChange={(e) => saver.change({ notes: e.target.value })}
          onBlur={() => void saver.flush()}
        />
      ) : god.notes ? (
        <p className="notes-text">{god.notes}</p>
      ) : (
        <p className="muted">No notes.</p>
      )}

      {editing && (
        <PromptDialog
          title={editing.label}
          initial={god[editing.field]}
          allowEmpty={editing.field !== 'name'}
          onClose={() => setEditing(null)}
          onSubmit={(value) => saver.change({ [editing.field]: value }, true)}
        />
      )}
    </main>
  )
}

function FactRow({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="muted">{label}</span>
      <span>{value || '—'}</span>
    </>
  )
  return onClick ? (
    <button type="button" className="fact-row" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="fact-row">{content}</div>
  )
}
