// Character rules from ARCHITECTURE.md 1.3 B2. Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clampField,
  damage,
  formatModifier,
  heal,
  hpBar,
  isDead,
  modifier,
  setCurrentHp,
  setMaxHp,
  withDeathSaves,
} from '../src/lib/character.ts'

test('ability modifier and its formatting', () => {
  assert.equal(modifier(10), 0)
  assert.equal(modifier(11), 0)
  assert.equal(modifier(14), 2)
  assert.equal(modifier(9), -1)
  assert.equal(modifier(1), -5)
  assert.equal(modifier(30), 10)
  assert.equal(formatModifier(2), '+2')
  assert.equal(formatModifier(0), '+0')
  assert.equal(formatModifier(-1), '−1')
})

test('damage: temp HP absorbs first, current HP never below 0', () => {
  assert.deepEqual(damage({ hp_max: 20, hp_cur: 15, hp_temp: 5 }, 3), { hp_temp: 2, hp_cur: 15 })
  assert.deepEqual(damage({ hp_max: 20, hp_cur: 15, hp_temp: 5 }, 8), { hp_temp: 0, hp_cur: 12 })
  assert.deepEqual(damage({ hp_max: 20, hp_cur: 4, hp_temp: 0 }, 10), { hp_temp: 0, hp_cur: 0 })
  assert.deepEqual(damage({ hp_max: 20, hp_cur: 4, hp_temp: 0 }, -5), { hp_temp: 0, hp_cur: 4 })
})

test('heal: up to max, temp HP untouched', () => {
  assert.deepEqual(heal({ hp_max: 20, hp_cur: 15, hp_temp: 3 }, 3), { hp_cur: 18 })
  assert.deepEqual(heal({ hp_max: 20, hp_cur: 15, hp_temp: 3 }, 30), { hp_cur: 20 })
})

test('set current and max HP', () => {
  assert.deepEqual(setCurrentHp({ hp_max: 20, hp_cur: 5, hp_temp: 0 }, 25), { hp_cur: 20 })
  assert.deepEqual(setCurrentHp({ hp_max: 20, hp_cur: 5, hp_temp: 0 }, -3), { hp_cur: 0 })
  assert.deepEqual(setMaxHp({ hp_max: 20, hp_cur: 18, hp_temp: 0 }, 10), { hp_max: 10, hp_cur: 10 })
  assert.deepEqual(setMaxHp({ hp_max: 20, hp_cur: 18, hp_temp: 0 }, 30), { hp_max: 30, hp_cur: 18 })
  assert.deepEqual(setMaxHp({ hp_max: 20, hp_cur: 18, hp_temp: 0 }, 0), { hp_max: 1, hp_cur: 1 })
})

test('death saves reset once current HP is above 0', () => {
  const dying = { death_saves_success: 2, death_saves_failure: 1 }
  assert.deepEqual(withDeathSaves(dying, { hp_cur: 3 }), { hp_cur: 3, death_saves_success: 0, death_saves_failure: 0 })
  assert.deepEqual(withDeathSaves(dying, { hp_cur: 0 }), { hp_cur: 0 })
  assert.deepEqual(withDeathSaves(dying, { hp_max: 10 }), { hp_max: 10 })
  assert.deepEqual(withDeathSaves({ death_saves_success: 0, death_saves_failure: 0 }, { hp_cur: 3 }), { hp_cur: 3 })
})

test('dead: three failures at 0 HP', () => {
  assert.equal(isDead({ hp_cur: 0, death_saves_success: 0, death_saves_failure: 3 }), true)
  assert.equal(isDead({ hp_cur: 0, death_saves_success: 1, death_saves_failure: 2 }), false)
  assert.equal(isDead({ hp_cur: 4, death_saves_success: 0, death_saves_failure: 3 }), false)
})

test('field limits', () => {
  assert.equal(clampField('speed', -2), 0)
  assert.equal(clampField('strength', 0), 1)
  assert.equal(clampField('strength', 45), 30)
  assert.equal(clampField('hp_temp', 999), 999)
})

test('HP bar turns red at 25% or less', () => {
  assert.deepEqual(hpBar({ hp_max: 20, hp_cur: 5, hp_temp: 0 }), { fill: 0.25, low: true })
  assert.deepEqual(hpBar({ hp_max: 20, hp_cur: 6, hp_temp: 0 }), { fill: 0.3, low: false })
  assert.deepEqual(hpBar({ hp_max: 20, hp_cur: 30, hp_temp: 0 }), { fill: 1, low: false })
})
