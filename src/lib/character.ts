// Character fields and rules (ARCHITECTURE.md 1.3 B1 and B2).

export type Character = {
  id: string
  version: number
  campaign_id: string
  owner_id: string
  name: string
  player: string
  class_level: string
  ac: number
  hp_max: number
  hp_cur: number
  hp_temp: number
  speed: number
  passive_perception: number
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export const CHARACTER_COLUMNS =
  'id, version, campaign_id, owner_id, name, player, class_level, ac, hp_max, hp_cur, hp_temp, speed, ' +
  'passive_perception, strength, dexterity, constitution, intelligence, wisdom, charisma'

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

/** Raising max HP does not raise current HP; lowering it caps current HP. */
export function setMaxHp(c: Hp, value: number): Pick<Character, 'hp_max' | 'hp_cur'> {
  const hp_max = Math.max(1, Math.trunc(value))
  return { hp_max, hp_cur: Math.min(c.hp_cur, hp_max) }
}

/** The minimum (and maximum) each plain number field allows. */
export const LIMITS = {
  ac: { min: 0 },
  hp_temp: { min: 0 },
  speed: { min: 0 },
  passive_perception: { min: 0 },
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
