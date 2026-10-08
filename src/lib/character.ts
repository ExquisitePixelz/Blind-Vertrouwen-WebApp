// Character fields and rules (ARCHITECTURE.md 1.3 B1 and B2, 1.10).

import type { ConditionKey, SpentDice } from './rest.ts'
import type { ClassEntry, Modifier, Proficiencies } from './sheet.ts'

/** A creature's size (1.8, 2026-10-09); it sets the carrying capacity. */
export type Size = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'

export const SIZES: { value: Size; label: string }[] = [
  { value: 'tiny', label: 'Tiny' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'huge', label: 'Huge' },
  { value: 'gargantuan', label: 'Gargantuan' },
]

export type Character = {
  id: string
  version: number
  campaign_id: string
  owner_id: string
  name: string
  player: string
  classes: ClassEntry[]
  race: string
  background: string
  size: Size
  hp_max: number
  hp_cur: number
  hp_temp: number
  speed: number
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  backstory: string
  /** A fixed AC (1.10, 2026-10-09); empty: calculated. */
  set_ac: number | null
  modifiers: Modifier[]
  proficiencies: Proficiencies
  death_saves_success: number
  death_saves_failure: number
  inspiration: boolean
  conditions: ConditionKey[]
  exhaustion: number
  hit_dice_spent: SpentDice
}

export const CHARACTER_COLUMNS =
  'id, version, campaign_id, owner_id, name, player, classes, race, background, size, hp_max, hp_cur, hp_temp, speed, ' +
  'strength, dexterity, constitution, intelligence, wisdom, charisma, backstory, ' +
  'set_ac, modifiers, proficiencies, death_saves_success, death_saves_failure, inspiration, ' +
  'conditions, exhaustion, hit_dice_spent'

export type Ability = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

export const ABILITIES: { field: Ability; label: string }[] = [
  { field: 'strength', label: 'STR' },
  { field: 'dexterity', label: 'DEX' },
  { field: 'constitution', label: 'CON' },
  { field: 'intelligence', label: 'INT' },
  { field: 'wisdom', label: 'WIS' },
  { field: 'charisma', label: 'CHA' },
]

const clamp = (value: number, min: number, max = Infinity) => Math.min(max, Math.max(min, Math.trunc(value)))

/** floor((score − 10) / 2) */
export const modifier = (score: number) => Math.floor((score - 10) / 2)

/** "+2", "+0", "−1" (true minus sign, U+2212). */
export const formatModifier = (mod: number) => (mod < 0 ? `−${-mod}` : `+${mod}`)

type Hp = Pick<Character, 'hp_max' | 'hp_cur' | 'hp_temp'>

/** Temp HP absorbs damage first, then current HP, never below 0. */
export function damage(c: Hp, amount: number): Pick<Character, 'hp_cur' | 'hp_temp'> {
  const x = Math.max(0, amount)
  const absorbed = Math.min(c.hp_temp, x)
  return { hp_temp: c.hp_temp - absorbed, hp_cur: Math.max(0, c.hp_cur - (x - absorbed)) }
}

/** Healing never exceeds max HP and never changes temp HP. */
export function heal(c: Hp, amount: number): Pick<Character, 'hp_cur'> {
  return { hp_cur: Math.min(c.hp_max, c.hp_cur + Math.max(0, amount)) }
}

export function setCurrentHp(c: Hp, value: number): Pick<Character, 'hp_cur'> {
  return { hp_cur: clamp(value, 0, c.hp_max) }
}

type DeathSaves = Pick<Character, 'death_saves_success' | 'death_saves_failure'>

/**
 * Three failed death saves at 0 HP, or exhaustion 6 (1.10, 1.12): the name is
 * crossed out. Nothing else changes; some spells still bring a dead
 * character back, and healing (or lowering exhaustion) clears it.
 */
export const isDead = (c: DeathSaves & Pick<Character, 'hp_cur'> & { exhaustion?: number }) =>
  (c.hp_cur === 0 && c.death_saves_failure >= 3) || (c.exhaustion ?? 0) >= 6

/**
 * An HP change, plus the death saves reset to zero once current HP is above 0
 * (5e: regaining any hit points resets them; ARCHITECTURE.md 1.10).
 */
export function withDeathSaves<P extends Partial<Pick<Character, 'hp_cur'>>>(
  c: DeathSaves,
  patch: P,
): P | (P & DeathSaves) {
  if (patch.hp_cur === undefined || patch.hp_cur <= 0) return patch
  if (!c.death_saves_success && !c.death_saves_failure) return patch
  return { ...patch, death_saves_success: 0, death_saves_failure: 0 }
}

/** Raising max HP does not raise current HP; lowering it caps current HP. */
export function setMaxHp(c: Hp, value: number): Pick<Character, 'hp_max' | 'hp_cur'> {
  const hp_max = Math.max(1, Math.trunc(value))
  return { hp_max, hp_cur: Math.min(c.hp_cur, hp_max) }
}

/** The minimum (and maximum) each plain number field allows. */
export const LIMITS = {
  hp_temp: { min: 0 },
  speed: { min: 0 },
  strength: { min: 1, max: 30 },
  dexterity: { min: 1, max: 30 },
  constitution: { min: 1, max: 30 },
  intelligence: { min: 1, max: 30 },
  wisdom: { min: 1, max: 30 },
  charisma: { min: 1, max: 30 },
} as const

export function clampField(field: keyof typeof LIMITS, value: number) {
  const limit: { min: number; max?: number } = LIMITS[field]
  return clamp(value, limit.min, limit.max)
}

/** HP bar fill 0–1; red at 25% or less. */
export function hpBar(c: Hp) {
  const fill = Math.min(1, Math.max(0, c.hp_cur / c.hp_max))
  return { fill, low: fill <= 0.25 }
}
