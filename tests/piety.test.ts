// Piety milestone bar. Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { caption, clampPiety, segments } from '../src/lib/piety.ts'

test('segments fill proportionally and complete at each milestone', () => {
  assert.deepEqual(segments(0).map((s) => s.fill), [0, 0, 0, 0])
  assert.deepEqual(segments(3).map((s) => [s.fill, s.reached]), [[1, true], [0, false], [0, false], [0, false]])
  const at12 = segments(12)
  assert.deepEqual(at12.map((s) => s.reached), [true, true, false, false])
  assert.equal(at12[2].fill, 2 / 15)
  assert.deepEqual(segments(50).map((s) => s.reached), [true, true, true, true])
})

test('caption shows the next milestone', () => {
  assert.equal(caption(0), '0 / 50 · next at 3')
  assert.equal(caption(3), '3 / 50 · next at 10')
  assert.equal(caption(24), '24 / 50 · next at 25')
  assert.equal(caption(50), '50 / 50 · all milestones reached')
})

test('scores stay between 0 and 50', () => {
  assert.equal(clampPiety(-1), 0)
  assert.equal(clampPiety(51), 50)
  assert.equal(clampPiety(12), 12)
})
