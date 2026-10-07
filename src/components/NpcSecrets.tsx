import { useEffect, useState } from 'react'
import { ConfirmDialog, NumberDialog, PickDialog } from './Dialog'
import { MarkdownNotes } from './MarkdownNotes'
import { ConflictBanner } from './SaveState'
import { ABILITIES, formatModifier, modifier, type Ability } from '../lib/character'
import { CR_VALUES, NPC_SECRETS_COLUMNS, type NpcSecrets as Secrets } from '../lib/npcs'
import { useRowSaver, type SaveStatus } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type NumberField = 'ac' | 'hp_max' | 'speed' | Ability
type Open = { kind: 'number'; field: NumberField; label: string } | { kind: 'cr' } | { kind: 'remove' }

const clampAbility = (value: number) => Math.min(30, Math.max(1, value))

/**
 * An NPC's DM secrets and stats (1.13): its own row with audience 'dm', so
 * players never receive it. Only the NPC page of the DM shows this.
 */
export function NpcSecrets({ npcId, onStatus }: { npcId: string; onStatus: (status: SaveStatus) => void }) {
  const [open, setOpen] = useState<Open | null>(null)
  const close = () => setOpen(null)

  const row = useLoad(async () => {
    return must(
      await supabase.from('npc_secrets').select(NPC_SECRETS_COLUMNS).eq('npc_id', npcId).is('deleted_at', null).maybeSingle(),
    ) as Secrets | null
  }, [npcId])

  const saver = useRowSaver<Secrets>('npc_secrets', row.data ?? undefined, (saved) => row.mutate(() => saved))
  const s = saver.view
  const tap = (patch: Partial<Secrets>) => saver.change(patch, true)

  useEffect(() => onStatus(saver.status), [saver.status, onStatus])

  if (row.error) return <p className="error">{row.error}</p>
  if (!s) return null

  const number = (field: NumberField, label: string) => () => setOpen({ kind: 'number', field, label })
  const shown = (value: number | null, unit = '') => (value === null ? '—' : `${value}${unit}`)

  return (
    <>
      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(row.reload)} />
      )}

      <MarkdownNotes
        title="DM secrets"
        hint="Only you can see this, even after the NPC is revealed."
        notes={s.secrets}
        onChange={(secrets) => saver.change({ secrets })}
        onBlur={() => void saver.flush()}
        placeholder="What the players don’t know…"
        emptyText="No secrets yet. Tap Edit to write some."
      />

      <section>
        <div className="title-row">
          <h2>Stats</h2>
          {s.has_stats && (
            <button type="button" className="small-button secondary" onClick={() => setOpen({ kind: 'remove' })}>
              Remove stats
            </button>
          )}
        </div>
        <p className="muted small notes-hint">Only you can see these.</p>
        {!s.has_stats ? (
          <button type="button" className="small-button" onClick={() => tap({ has_stats: true })}>
            Add stats
          </button>
        ) : (
          <>
            <div className="tiles">
              <button type="button" className="tappable tile" onClick={number('ac', 'AC')}>
                <span className="muted small">AC</span>
                <span className="tile-value">{shown(s.ac)}</span>
              </button>
              <button type="button" className="tappable tile" onClick={number('hp_max', 'Max HP')}>
                <span className="muted small">Max HP</span>
                <span className="tile-value">{shown(s.hp_max)}</span>
              </button>
              <button type="button" className="tappable tile" onClick={number('speed', 'Speed (ft)')}>
                <span className="muted small">Speed</span>
                <span className="tile-value">{shown(s.speed, ' ft')}</span>
              </button>
            </div>
            <div className="tiles abilities npc-abilities">
              {ABILITIES.map(({ field, label }) => (
                <button key={field} type="button" className="tappable tile" onClick={number(field, label)}>
                  <span className="muted small">{label}</span>
                  <span className="tile-value">{s[field]}</span>
                  <span className="tile-sub">{formatModifier(modifier(s[field]))}</span>
                </button>
              ))}
            </div>
            <div className="card npc-cr">
              <button type="button" className="fact-row" onClick={() => setOpen({ kind: 'cr' })}>
                <span className="muted">Challenge rating</span>
                <span>{s.cr ?? '—'}</span>
              </button>
            </div>
            <MarkdownNotes
              title="Actions"
              notes={s.actions}
              onChange={(actions) => saver.change({ actions })}
              onBlur={() => void saver.flush()}
              placeholder="Spear +4, 1d6+2 piercing…"
              emptyText="No actions yet. Tap Edit to add attacks, spells and traits."
            />
          </>
        )}
      </section>

      {open?.kind === 'number' && (
        <NumberDialog
          title={open.label}
          initial={(s[open.field] as number | null) ?? 0}
          onClose={close}
          actions={[
            ...(['ac', 'hp_max', 'speed'].includes(open.field)
              ? [{ label: 'Clear', className: 'secondary', onApply: () => tap({ [open.field]: null }) }]
              : []),
            {
              label: 'Set',
              onApply: (value: number) =>
                tap({ [open.field]: ['ac', 'hp_max', 'speed'].includes(open.field) ? value : clampAbility(value) }),
            },
          ]}
        />
      )}
      {open?.kind === 'cr' && (
        <PickDialog<string | null>
          title="Challenge rating"
          options={[{ value: null, label: 'None' }, ...CR_VALUES.map((cr) => ({ value: cr, label: cr }))]}
          onClose={close}
          onPick={(cr) => tap({ cr })}
        />
      )}
      {open?.kind === 'remove' && (
        <ConfirmDialog
          title="Remove stats"
          message="The stat block will be hidden. The numbers are kept, so Add stats brings them back."
          confirmLabel="Remove"
          onClose={close}
          onConfirm={() => tap({ has_stats: false })}
        />
      )}
    </>
  )
}
