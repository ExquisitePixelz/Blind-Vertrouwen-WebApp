import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ClassDialog } from '../components/ClassDialog'
import { ConfirmDialog, NumberDialog, PickDialog, PromptDialog } from '../components/Dialog'
import { TopBar } from '../components/TopBar'
import { FactRow } from '../components/FactRow'
import { MarkdownNotes } from '../components/MarkdownNotes'
import { Press } from '../components/Press'
import { PrivateSections } from '../components/PrivateSections'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import { StatDialog } from '../components/StatDialog'
import {
  ABILITIES,
  CHARACTER_COLUMNS,
  clampField,
  damage,
  formatModifier,
  heal,
  hpBar,
  setCurrentHp,
  isDead,
  setMaxHp,
  withDeathSaves,
  type Ability,
  type Character,
} from '../lib/character'
import { loadGods } from '../lib/gods'
import { changeList, ListChangedError } from '../lib/listChange'
import { useMe } from '../lib/me'
import { useRowSaver, type SaveStatus } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { NAME_MAX } from '../lib/limits'
import {
  buildSheet,
  canAddClass,
  formatClasses,
  formatParts,
  MAX_LEVEL,
  MAX_MODIFIERS,
  maxLevelFor,
  SKILLS,
  tickSave,
  tickSkill,
  totalLevel,
  UNARMORED,
  type ClassEntry,
  type EffectItem,
  type Modifier,
  type Proficiencies,
  type Sheet,
  type Target,
  type Total,
} from '../lib/sheet'

type NumberField = 'hp_temp' | 'speed' | Ability

/** A number with its own dialog (1.10): everything a modifier can go on, except "all saves". */
type StatKey = Exclude<Target, 'save.all'>

type Open =
  | { kind: 'hp' }
  | { kind: 'damage' }
  | { kind: 'heal' }
  | { kind: 'max' }
  | { kind: 'number'; field: NumberField; label: string }
  | { kind: 'text'; field: 'name' | 'player' | 'race' | 'background'; label: string }
  | { kind: 'class'; index: number | null }
  | { kind: 'removeClass'; index: number }
  | { kind: 'stat'; key: StatKey }
  | { kind: 'unarmored' }
  | { kind: 'menu' }
  | { kind: 'delete' }

/**
 * Character sheet (1.3 B3, 1.8, 1.10). The owner and the DM edit; everyone
 * else in the campaign sees it read-only, with nothing tappable (B4), and
 * does not see the private notes, coins or inventory.
 */
export function CharacterPage() {
  const { campaignId = '', characterId = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open | null>(null)
  const [privateStatus, setPrivateStatus] = useState<SaveStatus>('saved')
  const [notice, setNotice] = useState<string | null>(null)
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

  // What the character's counting items add (1.10), for everyone ...
  const effects = useLoad(async () => {
    const row = must(
      await supabase.from('character_effects').select('items').eq('character_id', characterId).maybeSingle(),
    ) as { items: EffectItem[] } | null
    return row?.items ?? []
  }, [characterId])

  // ... and the names of those items, which only the owner and the DM can read.
  const itemNames = useLoad(async () => {
    const rows = must(
      await supabase.from('inventory_items').select('id, name').eq('character_id', characterId).is('deleted_at', null),
    ) as { id: string; name: string }[]
    return new Map(rows.map((i) => [i.id, i.name]))
  }, [characterId])

  const saver = useRowSaver<Character>('characters', character.data ?? undefined, (saved) =>
    character.mutate(() => saved),
  )
  const c = saver.view

  if (character.error) return (
      <main className="page">
        <TopBar back={`/c/${campaignId}/characters`} />
        <p className="error">{character.error}</p>
      </main>
    )
  if (character.loading && !character.data) return (
      <main className="page">
        <TopBar back={`/c/${campaignId}/characters`} />
      </main>
    )
  if (!c) {
    return (
      <main className="page">
        <TopBar back={`/c/${campaignId}/characters`} />
        <p className="muted">This character does not exist, or you cannot see it.</p>
      </main>
    )
  }

  const canEdit = me.isDm || c.owner_id === me.userId
  const tap = (next: Open) => (canEdit ? () => setOpen(next) : undefined)
  const save = (patch: Partial<Character>) => saver.change(patch, true)
  const saveHp = (patch: Partial<Character>) => save(withDeathSaves(c, patch))
  const bar = hpBar(c)
  const level = totalLevel(c.classes)
  const names = itemNames.data ?? new Map<string, string>()
  const sheet = buildSheet(c, effects.data ?? [], names)
  const stat = (key: StatKey) => tap({ kind: 'stat', key })

  /**
   * Lists (classes, modifiers, proficiencies) are saved one change at a time
   * (1.10, "Saving"): send what is still waiting, then apply the change to
   * the latest list. If the change no longer fits, the sheet reloads.
   */
  async function changeField<V>(field: 'classes' | 'modifiers' | 'proficiencies', change: (latest: V) => V) {
    await saver.settle()
    try {
      const saved = await changeList<Character, V>('characters', c!.id, field, change)
      character.mutate(() => saved)
    } catch (e) {
      if (e instanceof ListChangedError) character.reload()
      throw e
    }
  }

  /** `index` is the entry as this screen showed it; if someone else changed it since, nothing is saved. */
  const changeClasses = (change: (classes: ClassEntry[]) => ClassEntry[], index?: number) => {
    const shown = index === undefined ? undefined : c.classes[index]
    return changeField<ClassEntry[]>('classes', (latest) => {
      if (shown && JSON.stringify(latest[index!]) !== JSON.stringify(shown)) {
        throw new ListChangedError('Someone else changed the classes. They are reloaded; please try again.')
      }
      const next = change(latest)
      if (totalLevel(next) > MAX_LEVEL) throw new ListChangedError('The total level would pass 20.')
      return next
    })
  }

  const changeModifiers = (change: (modifiers: Modifier[]) => Modifier[]) => changeField<Modifier[]>('modifiers', change)
  const findModifier = (list: Modifier[], id: string) => {
    if (!list.some((m) => m.id === id)) throw new ListChangedError('Someone else removed this modifier.')
  }

  /**
   * A tick box: saved at once; a failure is shown above the lists. Callers
   * read the box's new state before calling: the save first waits for other
   * saves, and by then the box shows the stored state again.
   */
  const tick = (change: (p: Proficiencies) => Proficiencies) => {
    setNotice(null)
    changeField<Proficiencies>('proficiencies', change).catch((e: unknown) =>
      setNotice(e instanceof Error ? e.message : String(e)),
    )
  }

  return (
    <main className="page">
      <TopBar title={isDead(c) ? <s aria-label={`${c.name} (dead)`}>{c.name}</s> : c.name} back={`/c/${campaignId}/characters`}>
        {canEdit && (
          <button className="icon secondary" aria-label="More" onClick={() => setOpen({ kind: 'menu' })}>
            …
          </button>
        )}
      </TopBar>
      {canEdit && (
        <p className="page-status">
          <SaveIndicator status={worst(saver.status, privateStatus)} />
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
        {c.classes.map((entry, index) => (
          <FactRow
            key={index}
            label={index === 0 ? 'Class' : ''}
            value={formatClasses([entry])}
            onClick={tap({ kind: 'class', index })}
          />
        ))}
        <div className="fact-row">
          <span className="muted">Level</span>
          <span>
            {level}
            {canEdit && (
              <button
                type="button"
                className="small-button secondary fact-button"
                disabled={!canAddClass(c.classes)}
                onClick={() => setOpen({ kind: 'class', index: null })}
              >
                Add class
              </button>
            )}
          </span>
        </div>
        <FactRow label="Race" value={c.race} onClick={tap({ kind: 'text', field: 'race', label: 'Race' })} />
        <FactRow
          label="Background"
          value={c.background}
          onClick={tap({ kind: 'text', field: 'background', label: 'Background' })}
        />
        <FactRow label="Devoted to" value={devotion.data || 'None'} muted={!devotion.data} />
      </div>

      <div className="card hp-card">
        <Press onTap={tap({ kind: 'hp' })} className="hp-main">
          <span className="muted small label">HIT POINTS</span>
          <span>
            <span className="hp-cur">{c.hp_cur}</span>
            <span className="muted hp-max"> / {c.hp_max}</span>
            {c.hp_temp > 0 && <span className="hp-temp"> +{c.hp_temp} temp</span>}
          </span>
          <span className="hp-bar">
            <span className={bar.low ? 'low' : undefined} style={{ width: `${bar.fill * 100}%` }} />
          </span>
        </Press>
        {canEdit && (
          <div className="hp-buttons">
            <button className="danger" onClick={() => setOpen({ kind: 'damage' })}>
              Damage
            </button>
            <button onClick={() => setOpen({ kind: 'heal' })}>Heal</button>
          </div>
        )}
      </div>

      <div className="card death-card">
        {c.hp_cur === 0 && (
          <>
            <Pips
              label="Death save successes"
              count={c.death_saves_success}
              canEdit={canEdit}
              // The third success brings the character back at 1 HP (owner's rule, 1.10).
              onSet={(n) => (n === 3 ? saveHp({ hp_cur: 1 }) : save({ death_saves_success: n }))}
            />
            <Pips
              label="Death save failures"
              count={c.death_saves_failure}
              danger
              canEdit={canEdit}
              onSet={(n) => save({ death_saves_failure: n })}
            />
          </>
        )}
        <label className="check-row">
          <input
            type="checkbox"
            checked={c.inspiration}
            disabled={!canEdit}
            onChange={(e) => save({ inspiration: e.target.checked })}
          />
          <span>Inspiration</span>
        </label>
      </div>

      <div className="tiles">
        <Tile label="Max HP" value={c.hp_max} onTap={tap({ kind: 'max' })} />
        <Tile
          label="Temp HP"
          value={c.hp_temp}
          onTap={tap({ kind: 'number', field: 'hp_temp', label: 'Temp HP' })}
        />
        <Tile label="AC" value={sheet.ac.value} total={sheet.ac} onTap={stat('ac')} />
      </div>
      {sheet.ac.warnings.map((w) => (
        <p key={w} className="error small tile-warning">
          {w}
        </p>
      ))}
      <div className="tiles">
        <Tile
          label="Speed"
          value={`${sheet.speed.value} ft`}
          total={sheet.speed}
          onTap={tap({ kind: 'number', field: 'speed', label: 'Speed (base)' })}
          onLongPress={stat('speed')}
        />
        <Tile
          label="Passive Perc."
          value={sheet.passivePerception.value}
          total={sheet.passivePerception}
          onTap={stat('passive_perception')}
        />
        <Tile label="Initiative" value={formatModifier(sheet.initiative)} greyed />
      </div>

      <div className="title-row">
        <h2>Abilities</h2>
        <span className="muted small">Proficiency bonus {formatModifier(sheet.proficiencyBonus)}</span>
      </div>
      <div className="tiles abilities">
        {ABILITIES.map(({ field, label }) => (
          <Tile
            key={field}
            label={label}
            value={sheet.abilities[field].value}
            sub={formatModifier(sheet.abilities[field].modifier)}
            total={sheet.abilities[field]}
            onTap={tap({ kind: 'number', field, label: `${label} (base score)` })}
            onLongPress={stat(`ability.${field}`)}
          />
        ))}
      </div>
      {canEdit && <p className="muted small sheet-hint">Tap a score or speed to set it; hold it to add modifiers.</p>}

      {notice && <p className="error">{notice}</p>}

      <h2>Saving throws</h2>
      <div className="card">
        {ABILITIES.map(({ field, label }) => (
          <StatRow
            key={field}
            name={label}
            total={sheet.saves[field]}
            onTap={stat(`save.${field}`)}
            boxes={
              <input
                type="checkbox"
                aria-label={`${label} save proficient`}
                checked={sheet.saves[field].proficient}
                disabled={!canEdit}
                onChange={(e) => {
                  const on = e.target.checked
                  tick((p) => tickSave(p, field, on))
                }}
              />
            }
          />
        ))}
      </div>

      <div className="title-row">
        <h2>Skills</h2>
        <span className="muted small">Proficient · Expertise</span>
      </div>
      <div className="card">
        {SKILLS.map(({ key, label, ability }) => {
          const skill = sheet.skills[key]
          return (
            <StatRow
              key={key}
              name={label}
              ability={ABILITIES.find((a) => a.field === ability)!.label}
              total={skill}
              onTap={stat(`skill.${key}`)}
              boxes={
                <>
                  <input
                    type="checkbox"
                    aria-label={`${label} proficient`}
                    checked={skill.proficiency !== null}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const on = e.target.checked
                      tick((p) => tickSkill(p, key, 'proficient', on))
                    }}
                  />
                  <input
                    type="checkbox"
                    aria-label={`${label} expertise`}
                    checked={skill.proficiency === 'expertise'}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const on = e.target.checked
                      tick((p) => tickSkill(p, key, 'expertise', on))
                    }}
                  />
                </>
              }
            />
          )
        })}
      </div>

      <MarkdownNotes
        title="Backstory"
        notes={c.backstory}
        onChange={(backstory) => saver.change({ backstory })}
        onBlur={() => void saver.flush()}
        placeholder="Backstory, goals, personality…"
        emptyText={canEdit ? 'Nothing written yet. Tap Edit to start.' : 'No backstory yet.'}
        readOnly={!canEdit}
      />

      {canEdit && (
        <PrivateSections
          characterId={c.id}
          campaignId={c.campaign_id}
          strength={sheet.abilities.strength.value}
          onStatus={setPrivateStatus}
          onItemsChanged={() => {
            effects.reload()
            itemNames.reload()
          }}
        />
      )}

      {open?.kind === 'stat' && (
        <StatDialog
          {...statView(sheet, open.key)}
          target={open.key}
          modifiers={c.modifiers}
          items={effects.data ?? []}
          itemNames={names}
          onClose={close}
          onAdd={(label, value, target) =>
            changeModifiers((list) => {
              if (list.length >= MAX_MODIFIERS) throw new ListChangedError('A character holds at most 100 modifiers.')
              return [...list, { id: crypto.randomUUID(), target, label, value }]
            })
          }
          onEdit={(id, label, value, target) =>
            changeModifiers((list) => {
              findModifier(list, id)
              return list.map((m) => (m.id === id ? { ...m, label, value, target } : m))
            })
          }
          onDelete={(id) => changeModifiers((list) => list.filter((m) => m.id !== id))}
        >
          {open.key === 'ac' && (
            <div className="card stat-extra">
              <FactRow
                label="Without armor"
                value={UNARMORED.find((u) => u.value === c.unarmored_ac)!.label}
                onClick={() => setOpen({ kind: 'unarmored' })}
              />
            </div>
          )}
        </StatDialog>
      )}
      {open?.kind === 'unarmored' && (
        <PickDialog
          title="Unarmored AC"
          onClose={() => setTimeout(() => setOpen({ kind: 'stat', key: 'ac' }))}
          onPick={(unarmored_ac) => save({ unarmored_ac })}
          options={UNARMORED.map((u) => ({ value: u.value, label: `${u.label}${u.value === c.unarmored_ac ? ' •' : ''}` }))}
        />
      )}
      {open?.kind === 'hp' && (
        <NumberDialog
          title={`HP ${c.hp_cur} / ${c.hp_max}`}
          initial={0}
          onClose={close}
          actions={[
            { label: 'Damage', className: 'danger', onApply: (x) => saveHp(damage(c, x)) },
            { label: 'Heal', onApply: (x) => saveHp(heal(c, x)) },
            { label: 'Set', className: 'secondary', onApply: (x) => saveHp(setCurrentHp(c, x)) },
          ]}
        />
      )}
      {open?.kind === 'damage' && (
        <NumberDialog
          title="Damage"
          initial={0}
          onClose={close}
          actions={[{ label: 'Apply', className: 'danger', onApply: (x) => saveHp(damage(c, x)) }]}
        />
      )}
      {open?.kind === 'heal' && (
        <NumberDialog
          title="Heal"
          initial={0}
          onClose={close}
          actions={[{ label: 'Apply', onApply: (x) => saveHp(heal(c, x)) }]}
        />
      )}
      {open?.kind === 'max' && (
        <NumberDialog
          title="Max HP"
          initial={c.hp_max}
          onClose={close}
          actions={[{ label: 'Set', onApply: (x) => saveHp(setMaxHp(c, x)) }]}
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
          maxLength={NAME_MAX}
          onClose={close}
          onSubmit={(value) => save({ [open.field]: value })}
        />
      )}
      {open?.kind === 'class' && (open.index === null || c.classes[open.index]) && (
        <ClassDialog
          entry={open.index === null ? null : c.classes[open.index]}
          maxLevel={open.index === null ? MAX_LEVEL - level : maxLevelFor(c.classes, open.index)}
          onClose={close}
          onRemove={
            open.index !== null && c.classes.length > 1
              ? () => setOpen({ kind: 'removeClass', index: open.index! })
              : undefined
          }
          onSave={(entry) =>
            open.index === null
              ? changeClasses((latest) => [...latest, entry])
              : changeClasses((latest) => latest.map((e, i) => (i === open.index ? entry : e)), open.index)
          }
        />
      )}
      {open?.kind === 'removeClass' && c.classes[open.index] && (
        <ConfirmDialog
          title="Remove class"
          message={`${formatClasses([c.classes[open.index]])} will be removed from ${c.name}.`}
          confirmLabel="Remove"
          onClose={close}
          onConfirm={() =>
            changeClasses((latest) => {
              if (latest.length <= 1) throw new ListChangedError('The last class cannot be removed.')
              return latest.filter((_, i) => i !== open.index)
            }, open.index)
          }
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
            navigate(`/c/${campaignId}/characters`, { replace: true })
          }}
        />
      )}
    </main>
  )
}

/** Title, total and how it is shown, for the dialog of one number. */
function statView(sheet: Sheet, key: StatKey): { title: string; shown: string; total: Total; bonus?: boolean } {
  const [kind, name] = key.split('.')
  if (kind === 'ability') {
    const a = ABILITIES.find((x) => x.field === name)!
    return { title: a.label, shown: String(sheet.abilities[a.field].value), total: sheet.abilities[a.field] }
  }
  if (kind === 'save') {
    const a = ABILITIES.find((x) => x.field === name)!
    const total = sheet.saves[a.field]
    return { title: `${a.label} save`, shown: formatModifier(total.value), total, bonus: true }
  }
  if (kind === 'skill') {
    const s = SKILLS.find((x) => x.key === name)!
    const total = sheet.skills[s.key]
    return { title: s.label, shown: formatModifier(total.value), total, bonus: true }
  }
  if (key === 'ac') return { title: 'AC', shown: String(sheet.ac.value), total: sheet.ac }
  if (key === 'speed') return { title: 'Speed', shown: `${sheet.speed.value} ft`, total: sheet.speed }
  return { title: 'Passive Perception', shown: String(sheet.passivePerception.value), total: sheet.passivePerception }
}

const SEVERITY: SaveStatus[] = ['saved', 'saving', 'unsaved', 'conflict']

/** One indicator for the sheet: show the least-saved of its rows. */
const worst = (a: SaveStatus, b: SaveStatus) => (SEVERITY.indexOf(a) >= SEVERITY.indexOf(b) ? a : b)

/** Three death save circles (1.10): tapping one fills up to it, or empties it. */
function Pips({
  label,
  count,
  danger,
  canEdit,
  onSet,
}: {
  label: string
  count: number
  danger?: boolean
  canEdit: boolean
  onSet: (count: number) => void
}) {
  return (
    <div className="pips-row">
      <span className="muted">{label}</span>
      <span className="pips">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className={`pip${n <= count ? ' filled' : ''}${danger ? ' danger' : ''}`}
            aria-label={`${label} ${n}`}
            aria-pressed={n <= count}
            disabled={!canEdit}
            onClick={() => onSet(n <= count ? n - 1 : n)}
          />
        ))}
      </span>
    </div>
  )
}

function Tile({
  label,
  value,
  sub,
  total,
  greyed,
  onTap,
  onLongPress,
}: {
  label: string
  value: ReactNode
  sub?: string
  /** Shown as a small breakdown line when it has more than the plain calculation. */
  total?: Total
  greyed?: boolean
  onTap?: () => void
  onLongPress?: () => void
}) {
  return (
    <Press onTap={onTap} onLongPress={onLongPress} className={`tile${greyed ? ' greyed' : ''}`}>
      <span className="muted small">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className="tile-sub">{sub}</span>}
      {total?.extra && <span className="tile-parts">{formatParts(total)}</span>}
    </Press>
  )
}

/** A saving throw or skill row: tick boxes, the name, and the total with its breakdown. */
function StatRow({
  name,
  ability,
  total,
  boxes,
  onTap,
}: {
  name: string
  ability?: string
  total: Total
  boxes: ReactNode
  onTap?: () => void
}) {
  return (
    <div className="stat-row">
      <span className="stat-boxes">{boxes}</span>
      <Press onTap={onTap} className="stat-main">
        <span>
          {name}
          {ability && <span className="muted small"> {ability}</span>}
        </span>
        <span className="stat-total">{formatModifier(total.value)}</span>
        {total.extra && <span className="stat-parts muted small">{formatParts(total, true)}</span>}
      </Press>
    </div>
  )
}
