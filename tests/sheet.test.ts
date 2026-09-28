// The automatic character sheet from ARCHITECTURE.md 1.10. Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ARMOR,
  buildSheet,
  canAddClass,
  formatClasses,
  formatParts,
  itemCounts,
  maxLevelFor,
  proficiencyBonus,
  tickSave,
  tickSkill,
  type ArmorKey,
  type EffectItem,
  type Modifier,
  type SheetInput,
} from '../src/lib/sheet.ts'

const base: SheetInput = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  speed: 30,
  classes: [{ name: '', level: 1 }],
  modifiers: [],
  proficiencies: { saves: [], skills: {} },
  unarmored_ac: 'normal',
}

const character = (changes: Partial<SheetInput>): SheetInput => ({ ...base, ...changes })
let nextId = 0
const mod = (target: Modifier['target'], value: number, label = ''): Modifier => ({ id: `m${nextId++}`, target, label, value })
const armor = (key: ArmorKey, id: string = key): EffectItem => ({ item_id: id, armor: key, effects: [] })

test('proficiency bonus at every level', () => {
  const expected = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6]
  for (let level = 1; level <= 20; level++) assert.equal(proficiencyBonus(level), expected[level - 1], `level ${level}`)
  const sheet = buildSheet(character({ classes: [{ name: 'Fighter', level: 3 }, { name: 'Wizard', level: 2 }] }), [])
  assert.equal(sheet.level, 5)
  assert.equal(sheet.proficiencyBonus, 3)
})

test('final ability scores add modifiers and items, kept between 1 and 30', () => {
  const sheet = buildSheet(
    character({ dexterity: 15, strength: 29, charisma: 3, modifiers: [mod('ability.dexterity', 2, 'Elf'), mod('ability.strength', 5)] }),
    [{ item_id: 'belt', armor: null, effects: [{ target: 'ability.charisma', value: -5 }] }],
    new Map([['belt', 'Belt of Gloom']]),
  )
  assert.equal(sheet.abilities.dexterity.value, 17)
  assert.equal(sheet.abilities.dexterity.modifier, 3)
  assert.equal(formatParts(sheet.abilities.dexterity), 'Base 15 + Elf 2')
  assert.equal(sheet.abilities.strength.value, 30)
  assert.equal(formatParts(sheet.abilities.strength), 'Base 29 + Modifier 5 (max 30)')
  assert.equal(sheet.abilities.charisma.value, 1)
  assert.equal(sheet.abilities.charisma.limit, 'min 1')
  assert.equal(sheet.abilities.wisdom.extra, false)
  assert.equal(sheet.initiative, 3, 'initiative follows the final DEX')
})

test('saving throws: proficiency, one save, and all saves', () => {
  const sheet = buildSheet(
    character({
      wisdom: 14,
      classes: [{ name: 'Cleric', level: 5 }],
      proficiencies: { saves: ['wisdom'], skills: {} },
      modifiers: [mod('save.wisdom', 1, 'Blessing')],
    }),
    [{ item_id: 'cloak', armor: null, effects: [{ target: 'save.all', value: 1 }] }],
  )
  assert.equal(sheet.saves.wisdom.value, 2 + 3 + 1 + 1)
  assert.equal(sheet.saves.wisdom.proficient, true)
  assert.equal(formatParts(sheet.saves.wisdom, true), 'WIS +2 + Proficiency +3 + Blessing +1 + Item +1')
  assert.equal(sheet.saves.strength.value, 1, 'the cloak counts on every save')
  assert.equal(sheet.saves.strength.proficient, false)
})

test('skills: proficient, expertise, and modifiers', () => {
  const sheet = buildSheet(
    character({
      dexterity: 16,
      proficiencies: { saves: [], skills: { stealth: 'expertise', acrobatics: 'proficient' } },
      modifiers: [mod('skill.stealth', 1, 'Lucky charm')],
    }),
    [],
  )
  assert.equal(sheet.skills.stealth.value, 3 + 4 + 1)
  assert.equal(formatParts(sheet.skills.stealth, true), 'DEX +3 + Expertise +4 + Lucky charm +1')
  assert.equal(sheet.skills.acrobatics.value, 5)
  assert.equal(sheet.skills.sleight_of_hand.value, 3)
  assert.equal(sheet.skills.sleight_of_hand.proficiency, null)
  assert.equal(sheet.skills.athletics.value, 0, 'STR skill')
})

test('Passive Perception is 10 + Perception, plus its own modifiers', () => {
  const sheet = buildSheet(
    character({ wisdom: 8, proficiencies: { saves: [], skills: { perception: 'proficient' } }, modifiers: [mod('passive_perception', 5, 'Observant')] }),
    [],
  )
  assert.equal(sheet.skills.perception.value, 1)
  assert.equal(sheet.passivePerception.value, 16)
  assert.equal(formatParts(sheet.passivePerception), '10 + Perception 1 + Observant 5')
  const low = buildSheet(character({ wisdom: 1, modifiers: [mod('passive_perception', -30)] }), [])
  assert.equal(low.passivePerception.value, 0, 'never below 0')
})

test('AC without armor: the four Unarmored AC choices', () => {
  const stats = { dexterity: 14, constitution: 16, wisdom: 18 }
  const ac = (unarmored_ac: SheetInput['unarmored_ac'], items: EffectItem[] = []) =>
    buildSheet(character({ ...stats, unarmored_ac }), items).ac
  assert.equal(ac('normal').value, 12)
  assert.equal(ac('normal').extra, false, 'plain 10 + DEX needs no breakdown line')
  assert.equal(ac('barbarian').value, 15)
  assert.equal(formatParts(ac('barbarian')), '10 + DEX 2 + CON 3')
  assert.equal(ac('monk').value, 16)
  assert.equal(ac('monk', [armor('shield')]).value, 14, 'a monk with a shield counts as Normal, plus the shield')
  assert.equal(ac('barbarian', [armor('shield')]).value, 17, 'a barbarian may use a shield')
  assert.equal(ac('base13').value, 15)
})

test('AC with armor: light, medium and heavy, with low and high DEX', () => {
  const ac = (dexterity: number, key: ArmorKey) => buildSheet(character({ dexterity, unarmored_ac: 'monk' }), [armor(key)]).ac.value
  assert.equal(ac(18, 'studded_leather'), 16)
  assert.equal(ac(8, 'leather'), 10, 'light armor takes a negative DEX too')
  assert.equal(ac(18, 'half_plate'), 17, 'medium armor: DEX at most +2')
  assert.equal(ac(8, 'hide'), 11, 'medium armor takes a negative DEX')
  assert.equal(ac(18, 'plate'), 18, 'heavy armor: no DEX')
  assert.equal(ac(6, 'chain_mail'), 16, 'heavy armor: no negative DEX either')
  assert.equal(ARMOR.length, 13)
})

test('AC: shield, items and modifiers, several armors, and the 0 minimum', () => {
  const names = new Map([
    ['mail', 'Chain mail'],
    ['ring', 'Ring of Protection'],
  ])
  const items: EffectItem[] = [
    armor('chain_mail', 'mail'),
    armor('shield', 'shield-item'),
    { item_id: 'ring', armor: null, effects: [{ target: 'ac', value: 1 }] },
  ]
  const owner = buildSheet(character({}), items, names).ac
  assert.equal(owner.value, 19)
  assert.equal(formatParts(owner), 'Chain mail 16 + Shield 2 + Ring of Protection 1')
  assert.equal(formatParts(buildSheet(character({}), items).ac), 'Armor 16 + Shield 2 + Item 1', 'another player sees no names')
  assert.deepEqual(owner.warnings, [])

  const two = buildSheet(character({ dexterity: 20 }), [armor('studded_leather'), armor('ring_mail'), armor('shield', 'a'), armor('shield', 'b')]).ac
  assert.equal(two.value, 12 + 5 + 2, 'the best armor with this DEX, and one shield')
  assert.equal(two.warnings.length, 2)

  const none = buildSheet(character({ dexterity: 1, modifiers: [mod('ac', -30)] }), []).ac
  assert.equal(none.value, 0)
  assert.equal(none.limit, 'min 0')
})

test('speed adds modifiers and items, never below 0', () => {
  const sheet = buildSheet(character({ speed: 25, modifiers: [mod('speed', 10, 'Longstrider')] }), [])
  assert.equal(sheet.speed.value, 35)
  assert.equal(buildSheet(character({ speed: 5, modifiers: [mod('speed', -30)] }), []).speed.value, 0)
})

test('which items count', () => {
  const item = { equipped: true, attuned: false, attunement_required: false, quantity: 1, armor: null, effects: [{ target: 'ac' as const, value: 1 }] }
  assert.equal(itemCounts(item), true)
  assert.equal(itemCounts({ ...item, equipped: false }), false, 'not equipped')
  assert.equal(itemCounts({ ...item, attunement_required: true }), false, 'needs attunement')
  assert.equal(itemCounts({ ...item, attunement_required: true, attuned: true }), true)
  assert.equal(itemCounts({ ...item, quantity: 0 }), false, 'quantity 0')
  assert.equal(itemCounts({ ...item, effects: [] }), false, 'adds nothing')
  assert.equal(itemCounts({ ...item, effects: [], armor: 'shield' }), true, 'armor only')
})

test('the class list', () => {
  assert.equal(formatClasses([{ name: 'Fighter', level: 3 }, { name: 'Wizard', level: 2 }]), 'Fighter 3 / Wizard 2')
  assert.equal(formatClasses([{ name: '', level: 1 }]), 'Level 1')
  assert.equal(canAddClass([{ name: 'Fighter', level: 19 }]), true)
  assert.equal(canAddClass([{ name: 'Fighter', level: 20 }]), false, 'total level 20')
  assert.equal(canAddClass(Array.from({ length: 10 }, () => ({ name: '', level: 1 }))), false, '10 entries')
  assert.equal(maxLevelFor([{ name: 'Fighter', level: 15 }, { name: 'Wizard', level: 2 }], 1), 5)
})

test('proficiency ticks: expertise implies proficient', () => {
  const none = { saves: [], skills: {} }
  const expert = tickSkill(none, 'stealth', 'expertise', true)
  assert.deepEqual(expert.skills, { stealth: 'expertise' })
  assert.deepEqual(tickSkill(expert, 'stealth', 'expertise', false).skills, { stealth: 'proficient' })
  assert.deepEqual(tickSkill(expert, 'stealth', 'proficient', false).skills, {}, 'un-ticking Proficient clears Expertise')
  assert.deepEqual(tickSkill(expert, 'stealth', 'proficient', true).skills, { stealth: 'expertise' })
  assert.deepEqual(tickSave(tickSave(none, 'wisdom', true), 'dexterity', true).saves, ['wisdom', 'dexterity'])
  assert.deepEqual(tickSave({ saves: ['wisdom'], skills: {} }, 'wisdom', false).saves, [])
})
