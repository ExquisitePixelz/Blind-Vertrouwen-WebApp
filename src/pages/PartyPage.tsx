import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { CharacterName } from '../components/CharacterName'
import { ConditionChips } from '../components/Conditions'
import { NumberDialog } from '../components/Dialog'
import { LongRestDialog } from '../components/Rest'
import { TopBar } from '../components/TopBar'
import { damage, heal, isDead, setCurrentHp, withDeathSaves, type Character } from '../lib/character'
import { byName } from '../lib/gods'
import { useMe } from '../lib/me'
import { formatHitDice, hitDice, longRestChanges } from '../lib/rest'
import { buildSheet, formatClasses, type EffectItem } from '../lib/sheet'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

/** What the overview needs: no backstory, no notes (1.11 B5). */
const PARTY_COLUMNS =
  'id, version, name, classes, hp_max, hp_cur, hp_temp, death_saves_success, death_saves_failure, ' +
  'conditions, exhaustion, hit_dice_spent, strength, dexterity, constitution, intelligence, wisdom, charisma, ' +
  'speed, modifiers, proficiencies, unarmored_ac'

type Member = Pick<
  Character,
  | 'id'
  | 'version'
  | 'name'
  | 'classes'
  | 'hp_max'
  | 'hp_cur'
  | 'hp_temp'
  | 'death_saves_success'
  | 'death_saves_failure'
  | 'conditions'
  | 'exhaustion'
  | 'hit_dice_spent'
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma'
  | 'speed'
  | 'modifiers'
  | 'proficiencies'
  | 'unarmored_ac'
> & { ac: number; passive: number }

/** DM only (ARCHITECTURE.md 1.12): every character in the campaign at a glance. */
export function PartyPage() {
  const me = useMe()
  return me.isDm ? <Party /> : <Navigate to="/" replace />
}

function Party() {
  const { campaignId = '' } = useParams()
  const [hpOf, setHpOf] = useState<Member | null>(null)
  const [resting, setResting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const party = useLoad(async () => {
    const [rows, effects] = await Promise.all([
      supabase.from('characters').select(PARTY_COLUMNS).eq('campaign_id', campaignId).is('deleted_at', null).then(must),
      supabase.from('character_effects').select('character_id, items').eq('campaign_id', campaignId).then(must),
    ])
    const items = new Map(
      (effects as { character_id: string; items: EffectItem[] }[]).map((e) => [e.character_id, e.items]),
    )
    return (rows as unknown as Omit<Member, 'ac' | 'passive'>[])
      .map((c) => {
        const sheet = buildSheet(c, items.get(c.id) ?? [])
        return { ...c, ac: sheet.ac.value, passive: sheet.passivePerception.value }
      })
      .sort(byName)
  }, [campaignId])

  /** An HP change from the overview, with the conflict guard (3.4). */
  async function saveHp(c: Member, patch: Partial<Character>) {
    setNotice(null)
    const result = await supabase
      .from('characters')
      .update({ ...withDeathSaves(c, patch), version: c.version })
      .eq('id', c.id)
      .select('id, version, hp_cur, hp_temp, death_saves_success, death_saves_failure')
      .maybeSingle()
    if (result.error || !result.data) {
      setNotice(
        result.status === 409
          ? `${c.name} was changed elsewhere. The party is reloaded; please try again.`
          : (result.error?.message ?? 'You are not allowed to change this.'),
      )
      void party.reload()
      return
    }
    const saved = result.data as Partial<Member>
    party.mutate((list) => list?.map((m) => (m.id === c.id ? { ...m, ...saved } : m)))
  }

  const base = `/c/${campaignId}`
  const living = (party.data ?? []).filter((c) => !isDead(c))
  const fallen = (party.data ?? []).filter((c) => isDead(c))

  return (
    <main className={`page${party.loading && !party.data ? ' loading' : ''}`}>
      <TopBar title="Party" back="/" />
      {party.error && <p className="error">{party.error}</p>}
      {notice && <p className="error">{notice}</p>}
      {party.data?.length === 0 && <p className="muted">No characters yet.</p>}

      {party.data?.map((c) => {
        const sheet = `${base}/characters/${c.id}`
        const dice = formatHitDice(hitDice(c.classes, c.hit_dice_spent))
        const chips = c.conditions.length > 0 || c.exhaustion > 0
        return (
          <div key={c.id} className="card party-card">
            <Link to={sheet} className="party-head">
              <strong>
                <CharacterName c={c} />
              </strong>
              <span className="muted small">{formatClasses(c.classes)}</span>
            </Link>
            <div className="party-stats">
              <button type="button" className="party-stat" onClick={() => setHpOf(c)}>
                <span className="muted small">HP</span>
                <span className={`party-value${c.hp_cur === 0 ? ' error' : ''}`}>
                  {c.hp_cur}
                  <span className="muted"> / {c.hp_max}</span>
                  {c.hp_temp > 0 && <span className="hp-temp"> +{c.hp_temp}</span>}
                </span>
              </button>
              <Link to={sheet} className="party-stat">
                <span className="muted small">AC</span>
                <span className="party-value">{c.ac}</span>
              </Link>
              <Link to={sheet} className="party-stat">
                <span className="muted small">Passive Perc.</span>
                <span className="party-value">{c.passive}</span>
              </Link>
              <Link to={sheet} className="party-stat">
                <span className="muted small">Hit dice</span>
                <span className="party-value">{dice.summary}</span>
              </Link>
            </div>
            {chips && (
              <Link to={sheet} className="party-chips">
                <ConditionChips conditions={c.conditions} exhaustion={c.exhaustion} />
              </Link>
            )}
          </div>
        )
      })}

      {living.length > 0 && (
        <button type="button" className="secondary party-rest" onClick={() => setResting(true)}>
          Long rest for the party
        </button>
      )}

      {hpOf && (
        <NumberDialog
          title={`${hpOf.name}: HP ${hpOf.hp_cur} / ${hpOf.hp_max}`}
          initial={0}
          onClose={() => setHpOf(null)}
          actions={[
            { label: 'Damage', className: 'danger', onApply: (x) => void saveHp(hpOf, damage(hpOf, x)) },
            { label: 'Heal', onApply: (x) => void saveHp(hpOf, heal(hpOf, x)) },
            { label: 'Set', className: 'secondary', onApply: (x) => void saveHp(hpOf, setCurrentHp(hpOf, x)) },
          ]}
        />
      )}
      {resting && (
        <LongRestDialog
          title="Long rest for the party"
          groups={[
            ...living.map((c) => ({ name: c.name, changes: longRestChanges(c) })),
            ...fallen.map((c) => ({ name: c.name, changes: ['Dead: does not rest'] })),
          ]}
          onConfirm={async () => {
            must(await supabase.rpc('long_rest', { p_characters: living.map((c) => c.id) }))
            await party.reload()
          }}
          onClose={() => setResting(false)}
        />
      )}
    </main>
  )
}
