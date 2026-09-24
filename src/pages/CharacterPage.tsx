import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ConfirmDialog, NumberDialog, PickDialog, PromptDialog } from '../components/Dialog'
import { TopBar } from '../components/TopBar'
import { FactRow } from '../components/FactRow'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import {
  ABILITIES,
  CHARACTER_COLUMNS,
  clampField,
  damage,
  formatModifier,
  heal,
  hpBar,
  modifier,
  setCurrentHp,
  setMaxHp,
  type Ability,
  type Character,
} from '../lib/character'
import { loadGods } from '../lib/gods'
import { useMe } from '../lib/me'
import { useRowSaver } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type NumberField = 'ac' | 'hp_temp' | 'speed' | 'passive_perception' | Ability

type Open =
  | { kind: 'hp' }
  | { kind: 'damage' }
  | { kind: 'heal' }
  | { kind: 'max' }
  | { kind: 'number'; field: NumberField; label: string }
  | { kind: 'text'; field: 'name' | 'player' | 'class_level'; label: string }
  | { kind: 'menu' }
  | { kind: 'delete' }

/**
 * Character sheet (1.3 B3). The owner and the DM edit; everyone else in the
 * campaign sees it read-only, with nothing tappable (B4).
 */
export function CharacterPage() {
  const { campaignId = '', characterId = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open | null>(null)
  const close = () => setOpen(null)

  const character = useLoad(async () => {
    return must(
      await supabase
        .from('characters')
        .select(CHARACTER_COLUMNS)
        .eq('id', characterId)
        .is('deleted_at', null)
        .maybeSingle(),
    ) as Character | null
  }, [characterId])

  const devotion = useLoad(async () => {
    const [tracks, gods] = await Promise.all([
      supabase
        .from('piety_tracks')
        .select('god_id, custom_source_name')
        .eq('character_id', characterId)
        .is('deleted_at', null)
        .then(must),
      loadGods(),
    ])
    const names = new Map(gods.map((g) => [g.id, g.name]))
    return (tracks as { god_id: string | null; custom_source_name: string | null }[])
      .map((t) => (t.god_id ? names.get(t.god_id) : t.custom_source_name) ?? '')
      .filter(Boolean)
      .join(', ')
  }, [characterId])

  const saver = useRowSaver<Character>('characters', character.data ?? undefined, (saved) =>
    character.mutate(() => saved),
  )
  const c = saver.view

  if (character.error) return (
      <main className="page">
        <TopBar back={`/c/${campaignId}`} />
        <p className="error">{character.error}</p>
      </main>
    )
  if (character.loading && !character.data) return (
      <main className="page">
        <TopBar back={`/c/${campaignId}`} />
      </main>
    )
  if (!c) {
    return (
      <main className="page">
        <TopBar back={`/c/${campaignId}`} />
        <p className="muted">This character does not exist, or you cannot see it.</p>
      </main>
    )
  }

  const canEdit = me.isDm || c.owner_id === me.userId
  const tap = (next: Open) => (canEdit ? () => setOpen(next) : undefined)
  const save = (patch: Partial<Character>) => saver.change(patch, true)
  const bar = hpBar(c)

  return (
    <main className="page">
      <TopBar title={c.name} back={`/c/${campaignId}`}>
        {canEdit && (
          <button className="icon secondary" aria-label="More" onClick={() => setOpen({ kind: 'menu' })}>
            …
          </button>
        )}
      </TopBar>
      {canEdit && (
        <p className="page-status">
          <SaveIndicator status={saver.status} />
        </p>
      )}

      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(character.reload)} />
      )}

      <div className="card">
        <FactRow
          label="Player"
          value={c.player}
          onClick={tap({ kind: 'text', field: 'player', label: 'Player' })}
        />
        <FactRow
          label="Class & level"
          value={c.class_level}
          onClick={tap({ kind: 'text', field: 'class_level', label: 'Class & level' })}
        />
        <FactRow label="Devoted to" value={devotion.data || 'None'} muted={!devotion.data} />
      </div>

      <div className="card hp-card">
        <Tappable onClick={tap({ kind: 'hp' })} className="hp-main">
          <span className="muted small label">HIT POINTS</span>
          <span>
            <span className="hp-cur">{c.hp_cur}</span>
            <span className="muted hp-max"> / {c.hp_max}</span>
            {c.hp_temp > 0 && <span className="hp-temp"> +{c.hp_temp} temp</span>}
          </span>
          <span className="hp-bar">
            <span className={bar.low ? 'low' : undefined} style={{ width: `${bar.fill * 100}%` }} />
          </span>
        </Tappable>
        {canEdit && (
          <div className="hp-buttons">
            <button className="danger" onClick={() => setOpen({ kind: 'damage' })}>
              Damage
            </button>
            <button onClick={() => setOpen({ kind: 'heal' })}>Heal</button>
          </div>
        )}
      </div>

      <div className="tiles">
        <Tile label="Max HP" value={c.hp_max} onClick={tap({ kind: 'max' })} />
        <Tile
          label="Temp HP"
          value={c.hp_temp}
          onClick={tap({ kind: 'number', field: 'hp_temp', label: 'Temp HP' })}
        />
        <Tile label="AC" value={c.ac} onClick={tap({ kind: 'number', field: 'ac', label: 'AC' })} />
      </div>
      <div className="tiles">
        <Tile
          label="Speed"
          value={`${c.speed} ft`}
          onClick={tap({ kind: 'number', field: 'speed', label: 'Speed' })}
        />
        <Tile
          label="Passive Perc."
          value={c.passive_perception}
          onClick={tap({ kind: 'number', field: 'passive_perception', label: 'Passive Perception' })}
        />
        <Tile label="Initiative" value={formatModifier(modifier(c.dexterity))} greyed />
      </div>
      <div className="tiles abilities">
        {ABILITIES.map(({ field, label }) => (
          <Tile
            key={field}
            label={label}
            value={c[field]}
            sub={formatModifier(modifier(c[field]))}
            onClick={tap({ kind: 'number', field, label })}
          />
        ))}
      </div>

      {open?.kind === 'hp' && (
        <NumberDialog
          title={`HP ${c.hp_cur} / ${c.hp_max}`}
          initial={0}
          onClose={close}
          actions={[
            { label: 'Damage', className: 'danger', onApply: (x) => save(damage(c, x)) },
            { label: 'Heal', onApply: (x) => save(heal(c, x)) },
            { label: 'Set', className: 'secondary', onApply: (x) => save(setCurrentHp(c, x)) },
          ]}
        />
      )}
      {open?.kind === 'damage' && (
        <NumberDialog
          title="Damage"
          initial={0}
          onClose={close}
          actions={[{ label: 'Apply', className: 'danger', onApply: (x) => save(damage(c, x)) }]}
        />
      )}
      {open?.kind === 'heal' && (
        <NumberDialog
          title="Heal"
          initial={0}
          onClose={close}
          actions={[{ label: 'Apply', onApply: (x) => save(heal(c, x)) }]}
        />
      )}
      {open?.kind === 'max' && (
        <NumberDialog
          title="Max HP"
          initial={c.hp_max}
          onClose={close}
          actions={[{ label: 'Set', onApply: (x) => save(setMaxHp(c, x)) }]}
        />
      )}
      {open?.kind === 'number' && (
        <NumberDialog
          title={open.label}
          initial={c[open.field]}
          onClose={close}
          actions={[{ label: 'Set', onApply: (x) => save({ [open.field]: clampField(open.field, x) }) }]}
        />
      )}
      {open?.kind === 'text' && (
        <PromptDialog
          title={open.label}
          initial={c[open.field]}
          allowEmpty={open.field !== 'name'}
          onClose={close}
          onSubmit={(value) => save({ [open.field]: value })}
        />
      )}
      {open?.kind === 'menu' && (
        <PickDialog<Open>
          title={c.name}
          onClose={close}
          onPick={(next) => setTimeout(() => setOpen(next))}
          options={[
            { value: { kind: 'text', field: 'name', label: 'Rename' }, label: 'Rename' },
            { value: { kind: 'delete' }, label: 'Delete character', className: 'danger-text' },
          ]}
        />
      )}
      {open?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete character"
          message={`${c.name}, their stats and piety history will be removed.`}
          confirmLabel="Delete"
          onClose={close}
          onConfirm={async () => {
            must(await supabase.rpc('delete_character', { p_character_id: c.id }))
            navigate(`/c/${campaignId}`, { replace: true })
          }}
        />
      )}
    </main>
  )
}

function Tappable({ onClick, className, children }: { onClick?: () => void; className?: string; children: ReactNode }) {
  return onClick ? (
    <button type="button" className={`tappable ${className ?? ''}`} onClick={onClick}>
      {children}
    </button>
  ) : (
    <div className={className}>{children}</div>
  )
}

function Tile({
  label,
  value,
  sub,
  greyed,
  onClick,
}: {
  label: string
  value: ReactNode
  sub?: string
  greyed?: boolean
  onClick?: () => void
}) {
  return (
    <Tappable onClick={onClick} className={`tile${greyed ? ' greyed' : ''}`}>
      <span className="muted small">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className="tile-sub">{sub}</span>}
    </Tappable>
  )
}
