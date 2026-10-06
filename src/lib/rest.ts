// Conditions, hit dice and rests (ARCHITECTURE.md 1.12). Pure functions,
// unit-tested in tests/rest.test.ts. The database checks the same shapes and
// runs the long rest itself (`long_rest`, section 4); `longRestDice` here only
// shows beforehand what it will give back.

import type { ClassEntry } from './sheet.ts'

export type ConditionKey =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'

/** The 14 conditions of SRD 5.1, in the order the sheet shows them. */
export const CONDITIONS: { key: ConditionKey; label: string }[] = [
  { key: 'blinded', label: 'Blinded' },
  { key: 'charmed', label: 'Charmed' },
  { key: 'deafened', label: 'Deafened' },
  { key: 'frightened', label: 'Frightened' },
  { key: 'grappled', label: 'Grappled' },
  { key: 'incapacitated', label: 'Incapacitated' },
  { key: 'invisible', label: 'Invisible' },
  { key: 'paralyzed', label: 'Paralyzed' },
  { key: 'petrified', label: 'Petrified' },
  { key: 'poisoned', label: 'Poisoned' },
  { key: 'prone', label: 'Prone' },
  { key: 'restrained', label: 'Restrained' },
  { key: 'stunned', label: 'Stunned' },
  { key: 'unconscious', label: 'Unconscious' },
]

export const MAX_EXHAUSTION = 6

/** Switch one condition on or off; the list keeps the order above. */
export function toggleCondition(list: ConditionKey[], key: ConditionKey, on: boolean): ConditionKey[] {
  const next = new Set(list)
  if (on) next.add(key)
  else next.delete(key)
  return CONDITIONS.map((c) => c.key).filter((k) => next.has(k))
}

/** The labels of the active conditions, in the order above, plus "Exhaustion n" when above 0. */
export function conditionChips(list: ConditionKey[], exhaustion: number): string[] {
  const chips = CONDITIONS.filter((c) => list.includes(c.key)).map((c) => c.label)
  return exhaustion > 0 ? [...chips, `Exhaustion ${exhaustion}`] : chips
}

export type Die = 6 | 8 | 10 | 12
export const DICE: Die[] = [12, 10, 8, 6]

/** Spent hit dice per die size, as the database stores them: {"10": 2}. A missing key is 0. */
export type SpentDice = Partial<Record<`${Die}`, number>>

const CLASS_DICE: Record<string, Die> = {
  barbarian: 12,
  fighter: 10,
  paladin: 10,
  ranger: 10,
  bard: 8,
  cleric: 8,
  druid: 8,
  monk: 8,
  rogue: 8,
  warlock: 8,
  sorcerer: 6,
  wizard: 6,
}

/** The SRD hit die for a class name (case and spaces ignored); d8 for any other name or none. */
export const dieForName = (name: string): Die => CLASS_DICE[name.toLowerCase().replace(/\s+/g, '')] ?? 8

/** A class entry's hit die: the one someone picked, else the one from its name. */
export const hitDie = (entry: ClassEntry): Die => entry.die ?? dieForName(entry.name)

export type DiceRow = { die: Die; total: number; left: number }

/** Hit dice per die size, largest first, only sizes the character has. */
export function hitDice(classes: ClassEntry[], spent: SpentDice): DiceRow[] {
  return DICE.map((die) => {
    const total = classes.filter((c) => hitDie(c) === die).reduce((sum, c) => sum + c.level, 0)
    return { die, total, left: Math.max(0, total - (spent[`${die}`] ?? 0)) }
  }).filter((row) => row.total > 0)
}

/** "Hit dice 3 / 5", with the dice per size when there is more than one: "d10 2 / 3 · d8 1 / 2". */
export function formatHitDice(rows: DiceRow[]): { summary: string; perDie: string | null } {
  const left = rows.reduce((sum, r) => sum + r.left, 0)
  const total = rows.reduce((sum, r) => sum + r.total, 0)
  return {
    summary: `${left} / ${total}`,
    perDie: rows.length > 1 ? rows.map((r) => `d${r.die} ${r.left} / ${r.total}`).join(' · ') : null,
  }
}

/** Short rest: one hit die rolled heals the roll plus the CON modifier, at least 0. */
export const shortRestHealing = (roll: number, conModifier: number) => Math.max(0, roll + conModifier)

/** The spent dice after spending one more of this size. */
export const spendDie = (spent: SpentDice, die: Die): SpentDice => ({ ...spent, [`${die}`]: (spent[`${die}`] ?? 0) + 1 })

/**
 * The spent dice after a long rest: back up to half the total level (at
 * least 1), the largest dice first. Matches `private.hit_dice_after_long_rest`.
 */
export function longRestDice(spent: SpentDice, totalLevel: number): SpentDice {
  let left = Math.max(1, Math.floor(totalLevel / 2))
  const result: SpentDice = {}
  for (const die of DICE) {
    const now = spent[`${die}`] ?? 0
    const back = Math.min(now, left)
    left -= back
    if (now - back > 0) result[`${die}`] = now - back
  }
  return result
}

/** How many spent dice a long rest gives back. */
export function diceBack(spent: SpentDice, totalLevel: number): number {
  const count = (s: SpentDice) => DICE.reduce((sum, d) => sum + (s[`${d}`] ?? 0), 0)
  return count(spent) - count(longRestDice(spent, totalLevel))
}

type Restable = {
  hp_cur: number
  hp_max: number
  hp_temp: number
  exhaustion: number
  hit_dice_spent: SpentDice
  classes: ClassEntry[]
}

/** What a long rest will change, one line each, for the confirm dialog. */
export function longRestChanges(c: Restable): string[] {
  const level = c.classes.reduce((sum, e) => sum + e.level, 0)
  const back = diceBack(c.hit_dice_spent, level)
  return [
    c.hp_cur < c.hp_max && `HP ${c.hp_cur} → ${c.hp_max}`,
    c.hp_temp > 0 && `Temp HP ${c.hp_temp} → 0`,
    back > 0 && `${back} hit ${back === 1 ? 'die' : 'dice'} back`,
    c.exhaustion > 0 && `Exhaustion ${c.exhaustion} → ${c.exhaustion - 1}`,
  ].filter((line): line is string => Boolean(line))
}
