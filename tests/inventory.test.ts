// Coins and inventory rules from ARCHITECTURE.md 1.8. Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addCoins,
  attunedCount,
  byItemName,
  carriedWeight,
  carryingCapacity,
  formatWeight,
  parseWeight,
  setCoins,
  spendCoins,
  type Item,
} from '../src/lib/inventory.ts'

const noCoins = { cp: 0, sp: 0, gp: 0, pp: 0 }

test('coins: add, spend never below 0, set, and the upper limit', () => {
  assert.equal(addCoins(10, 5), 15)
  assert.equal(spendCoins(10, 3), 7)
  assert.equal(spendCoins(10, 30), 0)
  assert.equal(setCoins(42), 42)
  assert.equal(setCoins(-5), 0)
  assert.equal(addCoins(999990, 50), 999999)
})

test('weight: dot or comma, empty is 0, nonsense is refused', () => {
  assert.equal(parseWeight('0.5'), 0.5)
  assert.equal(parseWeight('0,5'), 0.5)
  assert.equal(parseWeight(' 12 '), 12)
  assert.equal(parseWeight(''), 0)
  assert.equal(parseWeight('.25'), 0.25)
  assert.equal(parseWeight('1.234'), 1.23)
  assert.equal(parseWeight('.'), null)
  assert.equal(parseWeight('abc'), null)
  assert.equal(parseWeight('-1'), null)
  assert.equal(parseWeight('1.2.3'), null)
  assert.equal(parseWeight('100000'), null)
  assert.equal(formatWeight(10), '10')
  assert.equal(formatWeight(0.5), '0.5')
  assert.equal(formatWeight(2.25), '2.25')
})

test('carried weight: quantity × weight, plus 50 coins to the pound', () => {
  const items = [
    { quantity: 2, weight: 10 },
    { quantity: 20, weight: 0.05 },
    { quantity: 0, weight: 3 },
  ]
  assert.equal(carriedWeight(items, noCoins), 21)
  assert.equal(carriedWeight(items, { cp: 25, sp: 0, gp: 25, pp: 0 }), 22)
  assert.equal(carriedWeight([], noCoins), 0)
  // numeric columns can arrive as strings
  assert.equal(carriedWeight([{ quantity: 3, weight: '1.5' as unknown as number }], noCoins), 4.5)
  assert.equal(carryingCapacity(10), 150)
  assert.equal(carryingCapacity(18), 270)
})

test('attunement count and item order', () => {
  assert.equal(attunedCount([{ attuned: true }, { attuned: false }, { attuned: true }]), 2)
  const names = ['rope', 'Arrows', 'bedroll', 'Zither'].map((name) => ({ name }) as Item)
  assert.deepEqual(names.sort(byItemName).map((i) => i.name), ['Arrows', 'bedroll', 'rope', 'Zither'])
})
