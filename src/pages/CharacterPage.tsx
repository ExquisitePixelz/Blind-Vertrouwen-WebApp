import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CharacterName } from '../components/CharacterName'
import { ClassDialog } from '../components/ClassDialog'
import { ConditionChips, ConditionsDialog } from '../components/Conditions'
import { LongRestDialog, ShortRestDialog } from '../components/Rest'
import { ConfirmDialog, NumberDialog, PickDialog, PromptDialog } from '../components/Dialog'
import { ChangeFaithDialog } from '../components/Faith'
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
  isDead,
  setCurrentHp,
  setMaxHp,
  SIZES,
  withDeathSaves,
  type Ability,
  type Character,
} from '../lib/character'
import { type Faith } from '../lib/faith'
import { loadGodNames } from '../lib/gods'
import { ITEM_COLUMNS, byItemName, type Item } from '../lib/inventory'
import { changeList, ListChangedError } from '../lib/listChange'
import { useMe } from '../lib/me'
import { useRowSaver, worstStatus, type SaveStatus } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { NAME_MAX } from '../lib/limits'
import {
  formatHitDice,
  hitDice,
  longRestChanges,
  shortRestHealing,
  spendDie,
  toggleCondition,
  type ConditionKey,
} from '../lib/rest'
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
  /** `back`: the number's dialog to return to (its Base row opened this). */
  | { kind: 'number'; field: NumberField; label: string; back?: StatKey }
  | { kind: 'text'; field: 'name' | 'player' | 'race' | 'background'; label: string }
  | { kind: 'class'; index: number | null }
  | { kind: 'removeClass'; index: number }
  | { kind: 'stat'; key: StatKey }
  | { kind: 'setAc' }
  | { kind: 'conditions' }
  | { kind: 'size' }
  | { kind: 'faith' }
  | { kind: 'shortRest' }
  | { kind: 'longRest' }
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

  // "Devoted to": the current tracks. A faith the character left is a former
  // track and shows only on the Piety page (1.1, 2026-10-08).
  const devotion = useLoad(async () => {
    const [tracks, gods] = await Promise.all([
      supabase
        .from('piety_tracks')
        .select('god_id, custom_source_name, custom_source_rules, former')
        .eq('character_id', characterId)
        .is('deleted_at', null)
        .order('created_at')
        .then(must),
      loadGodNames(),
    ])
    type Row = { god_id: string | null; custom_source_name: string | null; custom_source_rules: string | null; former: boolean }
    const all = tracks as Row[]
    const current = all.filter((t) => !t.former)
    const names = new Map(gods.map((g) => [g.id, g.name]))
    // The one custom faith (the database reuses it), to start the fields with.
    const custom = [...current, ...all].find((t) => t.god_id === null)
    const only = current.length === 1 ? current[0] : null
    const faith: Faith | null =
      current.length === 0
        ? { kind: 'none' }
        : only?.god_id
          ? { kind: 'god', godId: only.god_id }
          : only
            ? { kind: 'custom', name: only.custom_source_name ?? '', rules: only.custom_source_rules ?? '' }
            : null
    return {
      text: current
        .map((t) => (t.god_id ? names.get(t.god_id) : t.custom_source_name) ?? '')
        .filter(Boolean)
        .join(', '),
      gods,
      faith,
      customStart: { name: custom?.custom_source_name ?? '', rules: custom?.custom_source_rules ?? '' },
    }
  }, [characterId])

  // What the character's counting items add (1.10), for everyone ...
  const effects = useLoad(async () => {
    const row = must(
      await supabase.from('character_effects').select('items').eq('character_id', characterId).maybeSingle(),
    ) as { items: EffectItem[] } | null
    return row?.items ?? []
  }, [characterId])

  // ... and the items themselves, which only the owner and the DM can read:
  // the inventory list and the item names, read once (1.11 B6).
  const items = useLoad(async () => {
    const rows = must(
      await supabase.from('inventory_items').select(ITEM_COLUMNS).eq('character_id', characterId).is('deleted_at', null),
    ) as Item[]
    return rows.sort(byItemName)
  }, [characterId])

  const saver = useRowSaver<Character>('characters', character.data ?? undefined, (saved) =>
    character.mutate(() => saved),
  )
  const c = saver.view

  // The sheet is recalculated only when what it is made of changes, not on
  // every letter typed in the backstory (1.11 C8).
  const names = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i.name])), [items.data])
  const calculated = useMemo(
    () => c && buildSheet(c, effects.data ?? [], names),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      c?.strength,
      c?.dexterity,
      c?.constitution,
      c?.intelligence,
      c?.wisdom,
      c?.charisma,
      c?.speed,
      c?.classes,
      c?.modifiers,
      c?.proficiencies,
      c?.set_ac,
      effects.data,
      names,
    ],
  )

  if (character.error) return (
      <main className="page">
        <TopBar back={`/c/${campaignId}/characters`} />
        <p className="error">{character.error}</p>
      </main>
    )
  if (character.loading && !character.data) return (
      <main className="page loading">
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
  const sheet = calculated!
  const stat = (key: StatKey) => tap({ kind: 'stat', key })
  const diceRows = hitDice(c.classes, c.hit_dice_spent)
  const dice = formatHitDice(diceRows)
  const dead = isDead(c)

  /**
   * Lists (classes, modifiers, proficiencies) are saved one change at a time
   * (1.10, "Saving"): send what is still waiting, then apply the change to
   * the latest list. If the change no longer fits, the sheet reloads.
   */
  async function changeField<V>(field: 'classes' | 'modifiers' | 'proficiencies' | 'conditions', change: (latest: V) => V) {
    await saver.settle()
    try {
      const saved = await changeList<Character, V>('characters', c!.id, field, change)
      character.mutate((row) => row && { ...row, ...saved })
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
      <TopBar title={<CharacterName c={c} />} back={`/c/${campaignId}/characters`}>
        {canEdit && (
          <button className="icon secondary" aria-label="More" onClick={() => setOpen({ kind: 'menu' })}>
            …
          </button>
        )}
      </TopBar>
      {canEdit && (
        <p className="page-status">
          <SaveIndicator status={worstStatus(saver.status, privateStatus)} />
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
        <FactRow label="Size" value={SIZES.find((x) => x.value === c.size)?.label ?? 'Medium'} onClick={tap({ kind: 'size' })} />
        <FactRow
          label="Background"
          value={c.background}
          onClick={tap({ kind: 'text', field: 'background', label: 'Background' })}
        />
        <FactRow
          label="Devoted to"
          value={devotion.data?.text || 'None'}
          muted={!devotion.data?.text}
          onClick={devotion.data ? tap({ kind: 'faith' }) : undefined}
        />
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

      <div className="card rest-card">
        <div className="fact-row">
          <span className="muted">Hit dice</span>
          <span>
            {dice.summary}
            {dice.perDie && <span className="muted small rest-dice">{dice.perDie}</span>}
          </span>
        </div>
        {canEdit && !dead && (
          <div className="hp-buttons rest-buttons">
            <button className="secondary" onClick={() => setOpen({ kind: 'shortRest' })}>
              Short rest
            </button>
            <button className="secondary" onClick={() => setOpen({ kind: 'longRest' })}>
              Long rest
            </button>
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
        {(canEdit || c.conditions.length > 0 || c.exhaustion > 0) && (
          <ConditionsRow c={c} onTap={tap({ kind: 'conditions' })} />
        )}
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
          onTap={stat('speed')}
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
            onTap={stat(`ability.${field}`)}
          />
        ))}
      </div>
      {canEdit && <p className="muted small sheet-hint">Tap a number to change it or add modifiers.</p>}

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
              disadvantage={skill.disadvantage.length > 0}
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
          size={c.size}
          onStatus={setPrivateStatus}
          items={items}
          onItemsChanged={effects.reload}
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
          <StatExtra
            sheet={sheet}
            target={open.key}
            c={c}
            onBase={(field, label) => setOpen({ kind: 'number', field, label, back: open.key })}
            onSetAc={() => setOpen({ kind: 'setAc' })}
          />
        </StatDialog>
      )}
      {open?.kind === 'setAc' && (
        <NumberDialog
          title="Set AC"
          initial={c.set_ac ?? sheet.ac.value}
          onClose={() => setTimeout(() => setOpen({ kind: 'stat', key: 'ac' }))}
          actions={[
            ...(c.set_ac !== null ? [{ label: 'Clear', onApply: () => save({ set_ac: null }) }] : []),
            { label: 'Set', onApply: (x) => save({ set_ac: Math.min(30, Math.max(0, x)) }) },
          ]}
        />
      )}
      {open?.kind === 'shortRest' && (
        <ShortRestDialog
          hp={`HP ${c.hp_cur} / ${c.hp_max}`}
          dice={diceRows}
          conModifier={sheet.abilities.constitution.modifier}
          onSpend={(die, roll) =>
            saveHp({
              ...heal(c, shortRestHealing(roll, sheet.abilities.constitution.modifier)),
              hit_dice_spent: spendDie(c.hit_dice_spent, die),
            })
          }
          onClose={close}
        />
      )}
      {open?.kind === 'longRest' && (
        <LongRestDialog
          title="Long rest"
          groups={[{ changes: longRestChanges(c) }]}
          onConfirm={async () => {
            // Unsent changes first, so the rest starts from them and the
            // sheet's next save does not see a conflict.
            const { saved } = await saver.settle()
            if (!saved) throw new Error('Some changes are not saved yet. Try again when they are.')
            must(await supabase.rpc('long_rest', { p_characters: [c.id] }))
            await character.reload()
          }}
          onClose={close}
        />
      )}
      {open?.kind === 'faith' && devotion.data && (
        <ChangeFaithDialog
          characterId={c.id}
          gods={devotion.data.gods}
          current={devotion.data.faith}
          customStart={devotion.data.customStart}
          onSaved={devotion.reload}
          onClose={close}
        />
      )}
      {open?.kind === 'size' && (
        <PickDialog
          title="Size"
          onClose={close}
          onPick={(size) => save({ size })}
          options={SIZES.map((x) => ({ value: x.value, label: `${x.label}${x.value === c.size ? ' •' : ''}` }))}
        />
      )}
      {open?.kind === 'conditions' && (
        <ConditionsDialog
          conditions={c.conditions}
          exhaustion={c.exhaustion}
          onToggle={(key, on) => changeField<ConditionKey[]>('conditions', (latest) => toggleCondition(latest, key, on))}
          onExhaustion={(exhaustion) => save({ exhaustion })}
          onClose={close}
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
          onClose={() => {
            const back = open.back
            if (back) setTimeout(() => setOpen({ kind: 'stat', key: back }))
            else close()
          }}
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

/**
 * Extra rows at the top of a number's dialog (1.10, 2026-10-09): the base
 * score or speed (tap for the keypad), Set AC, and which armor gives
 * disadvantage on Stealth.
 */
function StatExtra({
  sheet,
  target,
  c,
  onBase,
  onSetAc,
}: {
  sheet: Sheet
  target: StatKey
  c: Character
  onBase: (field: NumberField, label: string) => void
  onSetAc: () => void
}) {
  const [kind, name] = target.split('.')
  if (kind === 'ability') {
    const a = ABILITIES.find((x) => x.field === name)!
    return (
      <div className="card stat-extra">
        <FactRow label="Base score" value={String(c[a.field])} onClick={() => onBase(a.field, `${a.label} (base score)`)} />
      </div>
    )
  }
  if (target === 'speed') {
    return (
      <div className="card stat-extra">
        <FactRow label="Base speed" value={`${c.speed} ft`} onClick={() => onBase('speed', 'Speed (base)')} />
      </div>
    )
  }
  if (target === 'ac') {
    return (
      <div className="card stat-extra">
        <FactRow label="Set AC" value={c.set_ac === null ? 'Calculated' : String(c.set_ac)} muted={c.set_ac === null} onClick={onSetAc} />
      </div>
    )
  }
  if (target === 'skill.stealth' && sheet.skills.stealth.disadvantage.length) {
    return (
      <div className="card stat-extra">
        <p className="small">
          <span className="chip disadvantage">Disadvantage</span> from {sheet.skills.stealth.disadvantage.join(', ')}
        </p>
      </div>
    )
  }
  return null
}

/** The conditions and exhaustion (1.12); tappable for the owner and the DM. */
function ConditionsRow({ c, onTap }: { c: Character; onTap?: () => void }) {
  const none = c.conditions.length === 0 && c.exhaustion === 0
  const content = (
    <>
      <span className="muted">Conditions</span>
      {none ? (
        <span className="muted">No conditions</span>
      ) : (
        <ConditionChips conditions={c.conditions} exhaustion={c.exhaustion} />
      )}
    </>
  )
  return onTap ? (
    <button type="button" className="fact-row conditions-row" onClick={onTap}>
      {content}
    </button>
  ) : (
    <div className="fact-row conditions-row">{content}</div>
  )
}

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
  disadvantage,
  onTap,
}: {
  name: string
  ability?: string
  total: Total
  boxes: ReactNode
  /** Armor gives disadvantage (Stealth, 1.10): a reminder, not a number. */
  disadvantage?: boolean
  onTap?: () => void
}) {
  return (
    <div className="stat-row">
      <span className="stat-boxes">{boxes}</span>
      <Press onTap={onTap} className="stat-main">
        <span>
          {name}
          {ability && <span className="muted small"> {ability}</span>}
          {disadvantage && <span className="chip disadvantage">Disadvantage</span>}
        </span>
        <span className="stat-total">{formatModifier(total.value)}</span>
        {total.extra && <span className="stat-parts muted small">{formatParts(total, true)}</span>}
      </Press>
    </div>
  )
}
