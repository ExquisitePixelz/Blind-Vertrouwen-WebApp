// The automatic character sheet (ARCHITECTURE.md 1.10): proficiency bonus,
// final ability scores, saving throws, skills, AC, Passive Perception and
// speed, each with the parts it is made of. Pure functions, unit-tested in
// tests/sheet.test.ts. The database checks the same shapes (section 4).

import { ABILITIES, modifier, type Ability } from './character.ts'

export type SkillKey =
  | 'acrobatics'
  | 'animal_handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight_of_hand'
  | 'stealth'
  | 'survival'

/** The 18 skills in alphabetical order, with their ability (PHB). */
export const SKILLS: { key: SkillKey; label: string; ability: Ability }[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dexterity' },
  { key: 'animal_handling', label: 'Animal Handling', ability: 'wisdom' },
  { key: 'arcana', label: 'Arcana', ability: 'intelligence' },
  { key: 'athletics', label: 'Athletics', ability: 'strength' },
  { key: 'deception', label: 'Deception', ability: 'charisma' },
  { key: 'history', label: 'History', ability: 'intelligence' },
  { key: 'insight', label: 'Insight', ability: 'wisdom' },
  { key: 'intimidation', label: 'Intimidation', ability: 'charisma' },
  { key: 'investigation', label: 'Investigation', ability: 'intelligence' },
  { key: 'medicine', label: 'Medicine', ability: 'wisdom' },
  { key: 'nature', label: 'Nature', ability: 'intelligence' },
  { key: 'perception', label: 'Perception', ability: 'wisdom' },
  { key: 'performance', label: 'Performance', ability: 'charisma' },
  { key: 'persuasion', label: 'Persuasion', ability: 'charisma' },
  { key: 'religion', label: 'Religion', ability: 'intelligence' },
  { key: 'sleight_of_hand', label: 'Sleight of Hand', ability: 'dexterity' },
  { key: 'stealth', label: 'Stealth', ability: 'dexterity' },
  { key: 'survival', label: 'Survival', ability: 'wisdom' },
]

export type Target =
  | `ability.${Ability}`
  | `save.${Ability}`
  | 'save.all'
  | `skill.${SkillKey}`
  | 'ac'
  | 'speed'
  | 'passive_perception'

const abilityLabel = (a: Ability) => ABILITIES.find((x) => x.field === a)!.label

/** Everything a custom modifier or an item bonus can go on, with its label. */
export const TARGETS: { target: Target; label: string }[] = [
  ...ABILITIES.map(({ field, label }) => ({ target: `ability.${field}` as Target, label })),
  ...ABILITIES.map(({ field, label }) => ({ target: `save.${field}` as Target, label: `${label} save` })),
  { target: 'save.all', label: 'All saving throws' },
  ...SKILLS.map(({ key, label }) => ({ target: `skill.${key}` as Target, label })),
  { target: 'ac', label: 'AC' },
  { target: 'speed', label: 'Speed' },
  { target: 'passive_perception', label: 'Passive Perception' },
]

export const targetLabel = (t: Target) => TARGETS.find((x) => x.target === t)?.label ?? t

export type ClassEntry = { name: string; level: number }
export type Modifier = { id: string; target: Target; label: string; value: number }
export type SkillProficiency = 'proficient' | 'expertise'
export type Proficiencies = { saves: Ability[]; skills: Partial<Record<SkillKey, SkillProficiency>> }
export type UnarmoredAc = 'normal' | 'barbarian' | 'monk' | 'base13'
export type Bonus = { target: Target; value: number }

export const MAX_LEVEL = 20
export const MAX_CLASSES = 10
export const MAX_MODIFIERS = 100
export const MAX_ITEM_BONUSES = 5
export const MODIFIER_LIMIT = 30

// ------------------------------------------------------------------
// Armor (SRD 5.1)
// ------------------------------------------------------------------

export type ArmorKey =
  | 'padded'
  | 'leather'
  | 'studded_leather'
  | 'hide'
  | 'chain_shirt'
  | 'scale_mail'
  | 'breastplate'
  | 'half_plate'
  | 'ring_mail'
  | 'chain_mail'
  | 'splint'
  | 'plate'
  | 'shield'

export type ArmorType = 'light' | 'medium' | 'heavy' | 'shield'

/** The armor table from SRD 5.1 (ARCHITECTURE.md 1.10). */
export const ARMOR: { key: ArmorKey; label: string; type: ArmorType; base: number }[] = [
  { key: 'padded', label: 'Padded', type: 'light', base: 11 },
  { key: 'leather', label: 'Leather', type: 'light', base: 11 },
  { key: 'studded_leather', label: 'Studded leather', type: 'light', base: 12 },
  { key: 'hide', label: 'Hide', type: 'medium', base: 12 },
  { key: 'chain_shirt', label: 'Chain shirt', type: 'medium', base: 13 },
  { key: 'scale_mail', label: 'Scale mail', type: 'medium', base: 14 },
  { key: 'breastplate', label: 'Breastplate', type: 'medium', base: 14 },
  { key: 'half_plate', label: 'Half plate', type: 'medium', base: 15 },
  { key: 'ring_mail', label: 'Ring mail', type: 'heavy', base: 14 },
  { key: 'chain_mail', label: 'Chain mail', type: 'heavy', base: 16 },
  { key: 'splint', label: 'Splint', type: 'heavy', base: 17 },
  { key: 'plate', label: 'Plate', type: 'heavy', base: 18 },
  { key: 'shield', label: 'Shield', type: 'shield', base: 2 },
]

export const armorInfo = (key: ArmorKey) => ARMOR.find((a) => a.key === key)!

export const UNARMORED: { value: UnarmoredAc; label: string }[] = [
  { value: 'normal', label: 'Normal (10 + DEX)' },
  { value: 'barbarian', label: 'Barbarian (10 + DEX + CON)' },
  { value: 'monk', label: 'Monk (10 + DEX + WIS, no shield)' },
  { value: 'base13', label: '13 + DEX (Mage Armor, natural armor)' },
]

// ------------------------------------------------------------------
// Items
// ------------------------------------------------------------------

/** What an item adds, as the character_effects row lists it. */
export type EffectItem = { item_id: string; armor: ArmorKey | null; effects: Bonus[] }

type ItemState = {
  equipped: boolean
  attuned: boolean
  attunement_required: boolean
  quantity: number
  armor: ArmorKey | null
  effects: Bonus[]
}

/**
 * An item counts while it is equipped, has a quantity above 0 and, when it
 * requires attunement, is attuned; and only if it adds something. The
 * database uses the same rule for character_effects.
 */
export const itemCounts = (i: ItemState) =>
  i.equipped && i.quantity > 0 && (i.attuned || !i.attunement_required) && (i.armor !== null || i.effects.length > 0)

// ------------------------------------------------------------------
// Class list and proficiency bonus
// ------------------------------------------------------------------

export const totalLevel = (classes: ClassEntry[]) => classes.reduce((sum, c) => sum + c.level, 0)

/** 2 + floor((level − 1) / 4): +2 at levels 1–4, up to +6 at 17–20. */
export const proficiencyBonus = (level: number) => 2 + Math.floor((Math.min(MAX_LEVEL, Math.max(1, level)) - 1) / 4)

/** "Fighter 3 / Wizard 2"; an entry without a name shows as "Level 3". */
export const formatClasses = (classes: ClassEntry[]) =>
  classes.map((c) => (c.name.trim() ? `${c.name.trim()} ${c.level}` : `Level ${c.level}`)).join(' / ')

/** Add class adds an entry at level 1, while there is room. */
export const canAddClass = (classes: ClassEntry[]) => classes.length < MAX_CLASSES && totalLevel(classes) < MAX_LEVEL

/** The highest level an entry may get without the total passing 20. */
export const maxLevelFor = (classes: ClassEntry[], index: number) =>
  Math.min(MAX_LEVEL, MAX_LEVEL - totalLevel(classes) + classes[index].level)

// ------------------------------------------------------------------
// Proficiency ticks
// ------------------------------------------------------------------

/**
 * Tick or un-tick a skill's Proficient or Expertise box. Ticking Expertise
 * also ticks Proficient; un-ticking Proficient clears Expertise.
 */
export function tickSkill(p: Proficiencies, skill: SkillKey, box: SkillProficiency, on: boolean): Proficiencies {
  const now = p.skills[skill]
  const next: SkillProficiency | undefined =
    box === 'expertise' ? (on ? 'expertise' : now ? 'proficient' : undefined) : on ? (now ?? 'proficient') : undefined
  const skills = { ...p.skills }
  if (next) skills[skill] = next
  else delete skills[skill]
  return { ...p, skills }
}

export function tickSave(p: Proficiencies, ability: Ability, on: boolean): Proficiencies {
  const saves = p.saves.filter((a) => a !== ability)
  return { ...p, saves: on ? [...saves, ability] : saves }
}

// ------------------------------------------------------------------
// The sheet
// ------------------------------------------------------------------

/** One part of a total, e.g. { label: 'DEX', value: 3 }. An empty label is a plain number. */
export type Part = { label: string; value: number }

export type Total = {
  value: number
  parts: Part[]
  /** Something beyond the plain calculation is in it: show the breakdown line. */
  extra: boolean
  /** Set when the total was cut off at a limit. */
  limit?: string
}

export type SheetInput = Record<Ability, number> & {
  speed: number
  classes: ClassEntry[]
  modifiers: Modifier[]
  proficiencies: Proficiencies
  unarmored_ac: UnarmoredAc
}

export type Sheet = {
  level: number
  proficiencyBonus: number
  abilities: Record<Ability, Total & { modifier: number }>
  saves: Record<Ability, Total & { proficient: boolean }>
  skills: Record<SkillKey, Total & { proficiency: SkillProficiency | null }>
  ac: Total & { warnings: string[] }
  passivePerception: Total
  speed: Total
  initiative: number
}

const sum = (parts: Part[]) => parts.reduce((s, p) => s + p.value, 0)

function limited(parts: Part[], extra: boolean, min: number, max = Infinity): Total {
  const raw = sum(parts)
  const value = Math.min(max, Math.max(min, raw))
  return { value, parts, extra, limit: raw > max ? `max ${max}` : raw < min ? `min ${min}` : undefined }
}

/**
 * Calculate the whole sheet. `items` comes from the character_effects row.
 * `itemNames` holds the names of the items the viewer may read (the owner
 * and the DM); everyone else sees "Armor", "Shield" and "Item".
 */
export function buildSheet(c: SheetInput, items: EffectItem[], itemNames: Map<string, string> = new Map()): Sheet {
  const itemLabel = (id: string, fallback: string) => itemNames.get(id) ?? fallback

  // Custom modifiers and item bonuses on one target.
  const bonuses = (target: Target): Part[] => [
    ...c.modifiers.filter((m) => m.target === target).map((m) => ({ label: m.label.trim() || 'Modifier', value: m.value })),
    ...items.flatMap((i) => i.effects.filter((e) => e.target === target).map((e) => ({ label: itemLabel(i.item_id, 'Item'), value: e.value }))),
  ]

  const level = Math.min(MAX_LEVEL, totalLevel(c.classes))
  const pb = proficiencyBonus(level)

  const abilities = {} as Sheet['abilities']
  for (const { field } of ABILITIES) {
    const extra = bonuses(`ability.${field}`)
    const total = limited([{ label: 'Base', value: c[field] }, ...extra], extra.length > 0, 1, 30)
    abilities[field] = { ...total, modifier: modifier(total.value) }
  }
  const mod = (a: Ability) => abilities[a].modifier

  const saves = {} as Sheet['saves']
  for (const { field, label } of ABILITIES) {
    const proficient = c.proficiencies.saves.includes(field)
    const extra = [...bonuses(`save.${field}`), ...bonuses('save.all')]
    const parts = [{ label, value: mod(field) }, ...(proficient ? [{ label: 'Proficiency', value: pb }] : []), ...extra]
    saves[field] = { value: sum(parts), parts, extra: extra.length > 0, proficient }
  }

  const skills = {} as Sheet['skills']
  for (const { key, ability } of SKILLS) {
    const proficiency = c.proficiencies.skills[key] ?? null
    const extra = bonuses(`skill.${key}`)
    const parts = [
      { label: abilityLabel(ability), value: mod(ability) },
      ...(proficiency === 'proficient' ? [{ label: 'Proficiency', value: pb }] : []),
      ...(proficiency === 'expertise' ? [{ label: 'Expertise', value: 2 * pb }] : []),
      ...extra,
    ]
    skills[key] = { value: sum(parts), parts, extra: extra.length > 0, proficiency }
  }

  const passiveExtra = bonuses('passive_perception')
  const passivePerception = limited(
    [{ label: '', value: 10 }, { label: 'Perception', value: skills.perception.value }, ...passiveExtra],
    passiveExtra.length > 0,
    0,
  )

  const speedExtra = bonuses('speed')
  const speed = limited([{ label: '', value: c.speed }, ...speedExtra], speedExtra.length > 0, 0)

  return {
    level,
    proficiencyBonus: pb,
    abilities,
    saves,
    skills,
    ac: armorClass(c.unarmored_ac, mod, items, itemLabel, bonuses('ac')),
    passivePerception,
    speed,
    initiative: mod('dexterity'),
  }
}

/**
 * AC (1.10): the best equipped body armor, or the Unarmored AC choice; +2
 * for a shield; then custom modifiers and item bonuses. Never below 0.
 */
function armorClass(
  unarmored: UnarmoredAc,
  mod: (a: Ability) => number,
  items: EffectItem[],
  itemLabel: (id: string, fallback: string) => string,
  extra: Part[],
): Total & { warnings: string[] } {
  const dex = mod('dexterity')
  const worn = items.filter((i) => i.armor !== null).map((i) => ({ id: i.item_id, ...armorInfo(i.armor!) }))
  const bodies = worn.filter((a) => a.type !== 'shield')
  const shields = worn.filter((a) => a.type === 'shield')

  const bodyParts = (a: (typeof bodies)[number]): Part[] => {
    const armor = { label: itemLabel(a.id, 'Armor'), value: a.base }
    if (a.type === 'heavy') return [armor]
    return [armor, { label: 'DEX', value: a.type === 'medium' ? Math.min(dex, 2) : dex }]
  }

  let base: Part[]
  if (bodies.length) {
    // The one that gives the highest AC with this DEX counts.
    base = bodies.map(bodyParts).reduce((best, parts) => (sum(parts) > sum(best) ? parts : best))
  } else if (unarmored === 'barbarian') {
    base = [{ label: '', value: 10 }, { label: 'DEX', value: dex }, { label: 'CON', value: mod('constitution') }]
  } else if (unarmored === 'monk' && !shields.length) {
    base = [{ label: '', value: 10 }, { label: 'DEX', value: dex }, { label: 'WIS', value: mod('wisdom') }]
  } else if (unarmored === 'base13') {
    base = [{ label: '', value: 13 }, { label: 'DEX', value: dex }]
  } else {
    base = [{ label: '', value: 10 }, { label: 'DEX', value: dex }]
  }

  const shield: Part[] = shields.length ? [{ label: itemLabel(shields[0].id, 'Shield'), value: 2 }] : []
  const warnings = [
    ...(bodies.length > 1 ? ['More than one armor is equipped; the best one counts.'] : []),
    ...(shields.length > 1 ? ['More than one shield is equipped; one counts.'] : []),
  ]
  const plain = !bodies.length && !shields.length && !extra.length && unarmored === 'normal'
  return { ...limited([...base, ...shield, ...extra], !plain, 0), warnings }
}

// ------------------------------------------------------------------
// Showing a total
// ------------------------------------------------------------------

const minus = (n: number) => (n < 0 ? `−${-n}` : `${n}`)
const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`)

/**
 * The breakdown line, e.g. "Chain mail 16 + Shield 2 + Ring 1" for a score,
 * or "DEX +3 + Proficiency +2 + Lucky charm +1" for a bonus (saves and
 * skills). A total cut off at a limit ends with "(max 30)".
 */
export function formatParts(total: Total, bonus = false): string {
  const text = total.parts
    .map((p) => (p.label ? `${p.label} ${bonus ? signed(p.value) : minus(p.value)}` : minus(p.value)))
    .join(' + ')
  return total.limit ? `${text} (${total.limit})` : text
}
