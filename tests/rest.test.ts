// Conditions, hit dice and rests from ARCHITECTURE.md 1.12. Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isDead } from '../src/lib/character.ts'
import {
  conditionChips,
  diceBack,
  dieForName,
  formatHitDice,
  hitDice,
  hitDie,
  longRestDice,
  shortRestHealing,
  spendDie,
  toggleCondition,
} from '../src/lib/rest.ts'

test('conditions keep the SRD order, each at most once', () => {
  assert.deepEqual(toggleCondition([], 'prone', true), ['prone'])
  assert.deepEqual(toggleCondition(['prone'], 'blinded', true), ['blinded', 'prone'])
  assert.deepEqual(toggleCondition(['blinded', 'prone'], 'prone', true), ['blinded', 'prone'])
  assert.deepEqual(toggleCondition(['blinded', 'prone'], 'blinded', false), ['prone'])
  assert.deepEqual(conditionChips(['poisoned', 'charmed'], 0), ['Charmed', 'Poisoned'])
  assert.deepEqual(conditionChips([], 3), ['Exhaustion 3'])
})

test('exhaustion 6 is death, like three failed death saves at 0 HP', () => {
  const alive = { hp_cur: 5, death_saves_success: 0, death_saves_failure: 0 }
  assert.equal(isDead({ ...alive, exhaustion: 5 }), false)
  assert.equal(isDead({ ...alive, exhaustion: 6 }), true)
  assert.equal(isDead({ hp_cur: 0, death_saves_success: 0, death_saves_failure: 3, exhaustion: 0 }), true)
  assert.equal(isDead(alive), false, 'rows read before Phase 10 have no exhaustion')
})

test('the hit die follows the class name, unless one was picked', () => {
  assert.equal(dieForName('Barbarian'), 12)
  assert.equal(dieForName(' fighter '), 10)
  assert.equal(dieForName('PALADIN'), 10)
  assert.equal(dieForName('Ranger'), 10)
  for (const name of ['Bard', 'Cleric', 'Druid', 'Monk', 'Rogue', 'Warlock']) assert.equal(dieForName(name), 8, name)
  assert.equal(dieForName('Sorcerer'), 6)
  assert.equal(dieForName('Wiz ard'), 6, 'spaces are ignored')
  assert.equal(dieForName('Blood Hunter'), 8, 'any other name is d8')
  assert.equal(dieForName(''), 8)
  assert.equal(hitDie({ name: 'Wizard', level: 3 }), 6)
  assert.equal(hitDie({ name: 'Wizard', level: 3, die: 12 }), 12)
})

test('hit dice per size, largest first, and how the sheet shows them', () => {
  const classes = [
    { name: 'Wizard', level: 2 },
    { name: 'Fighter', level: 3 },
    { name: 'Paladin', level: 1 },
  ]
  const rows = hitDice(classes, { '10': 1 })
  assert.deepEqual(rows, [
    { die: 10, total: 4, left: 3 },
    { die: 6, total: 2, left: 2 },
  ])
  assert.deepEqual(formatHitDice(rows), { summary: '5 / 6', perDie: 'd10 3 / 4 · d6 2 / 2' })
  assert.deepEqual(formatHitDice(hitDice([{ name: 'Rogue', level: 5 }], {})), { summary: '5 / 5', perDie: null })
  assert.deepEqual(hitDice([{ name: 'Rogue', level: 2 }], { '8': 4 }), [{ die: 8, total: 2, left: 0 }], 'never below 0')
})

test('short rest: the roll plus CON, at least 0', () => {
  assert.equal(shortRestHealing(7, 2), 9)
  assert.equal(shortRestHealing(1, -1), 0)
  assert.equal(shortRestHealing(1, -3), 0)
  assert.deepEqual(spendDie({}, 10), { '10': 1 })
  assert.deepEqual(spendDie({ '10': 1, '6': 2 }, 10), { '10': 2, '6': 2 })
})

test('long rest: back up to half the total level, at least 1, the largest dice first', () => {
  assert.deepEqual(longRestDice({ '10': 1, '8': 1, '6': 2 }, 5), { '6': 2 }, 'level 5: two back')
  assert.deepEqual(longRestDice({ '10': 3, '6': 3 }, 6), { '6': 3 }, 'level 6: three back')
  assert.deepEqual(longRestDice({ '8': 1 }, 1), {}, 'level 1: one back')
  assert.deepEqual(longRestDice({ '12': 2 }, 1), { '12': 1 })
  assert.deepEqual(longRestDice({}, 10), {})
  assert.equal(diceBack({ '10': 1, '8': 1, '6': 2 }, 5), 2)
  assert.equal(diceBack({ '6': 1 }, 20), 1)
})
