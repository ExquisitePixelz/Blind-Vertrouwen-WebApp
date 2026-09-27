// Quest Journal rules (ARCHITECTURE.md 1.9).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  currentObjective,
  groupQuests,
  hiddenRewardsText,
  kindText,
  objectivesVisibleToPlayers,
  splitObjectives,
  swapWith,
} from '../src/lib/quests.ts'

const objective = (id: string, sort_order: number, done = false, optional = false) => ({ id, sort_order, done, optional })

test('Players see ticked-off steps, the first open step, and every optional one', () => {
  const list = [
    objective('c', 3),
    objective('a', 1, true),
    objective('b', 2),
    objective('x', 4, false, true),
    objective('d', 5, true), // ticked off after an open step: still shown
  ]
  assert.deepEqual([...objectivesVisibleToPlayers(list)].sort(), ['a', 'b', 'd', 'x'])
  assert.equal(currentObjective(list)?.id, 'b')
})

test('With nothing ticked off, only the first step shows; with all done, all show', () => {
  assert.deepEqual([...objectivesVisibleToPlayers([objective('a', 1), objective('b', 2)])], ['a'])
  assert.deepEqual([...objectivesVisibleToPlayers([objective('a', 1, true), objective('b', 2, true)])].sort(), ['a', 'b'])
  assert.equal(currentObjective([objective('a', 1, true)]), undefined)
})

test('Equal sort orders fall back to the id, like the database', () => {
  const visible = objectivesVisibleToPlayers([objective('b', 1), objective('a', 1)])
  assert.deepEqual([...visible], ['a'])
})

test('Optional objectives go below the main ones, each in order', () => {
  const { main, optional } = splitObjectives([objective('o2', 9, false, true), objective('m2', 5), objective('o1', 2, false, true), objective('m1', 1)])
  assert.deepEqual(main.map((o) => o.id), ['m1', 'm2'])
  assert.deepEqual(optional.map((o) => o.id), ['o1', 'o2'])
})

test('Quests are grouped Hidden, Active, Inactive, Completed, Failed; Main first, then newest', () => {
  const q = (id: string, audience: 'dm' | 'members', status: string, kind: string, created_at: string) =>
    ({ id, audience, status, kind, created_at }) as Parameters<typeof groupQuests>[0][number] & { id: string }
  const groups = groupQuests([
    q('done', 'members', 'completed', 'side', '2026-01-01'),
    q('side-old', 'members', 'active', 'side', '2026-01-01'),
    q('side-new', 'members', 'active', 'side', '2026-02-01'),
    q('main', 'members', 'active', 'main', '2025-01-01'),
    q('secret', 'dm', 'active', 'main', '2026-01-01'),
  ])
  assert.deepEqual(groups.map((g) => g.key), ['hidden', 'active', 'completed'])
  assert.deepEqual(groups[1].quests.map((x) => x.id), ['main', 'side-new', 'side-old'])
  assert.equal(groups[1].folded, false)
  assert.equal(groups[2].folded, true)
})

test('Hidden rewards read "+ a hidden reward" or "+ n hidden rewards"', () => {
  assert.equal(hiddenRewardsText(0), null)
  assert.equal(hiddenRewardsText(1), '+ a hidden reward')
  assert.equal(hiddenRewardsText(3), '+ 3 hidden rewards')
})

test('A character quest shows the character’s name when it is known', () => {
  const names = (id: string) => (id === 'kit' ? 'Kit' : undefined)
  assert.equal(kindText({ kind: 'character', character_id: 'kit' }, names), 'Character quest · Kit')
  assert.equal(kindText({ kind: 'character', character_id: 'gone' }, names), 'Character quest')
  assert.equal(kindText({ kind: 'main', character_id: null }, names), 'Main quest')
})

test('Moving swaps with the neighbour, and does nothing at the ends', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(swapWith(list, 'b', -1), [{ id: 'b' }, { id: 'a' }])
  assert.equal(swapWith(list, 'a', -1), null)
  assert.equal(swapWith(list, 'c', 1), null)
})
