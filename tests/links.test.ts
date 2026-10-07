// Links in notes and the NPC list (ARCHITECTURE.md 1.13).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findTarget, hasLinks, insertMention, linkMarkdown, mentionAt, mentionMatches, parseLinkHref, type LinkTarget } from '../src/lib/links.ts'
import { CR_VALUES, filterNpcs, groupNpcs, npcPlace } from '../src/lib/npcs.ts'

const ID = '3f2a8c4e-1b2d-4e5f-8a9b-0c1d2e3f4a5b'
const target = (kind: LinkTarget['kind'], name: string, id = ID): LinkTarget => ({ kind, id, name, path: `/${kind}/${id}` })

test('A link is written as markdown with the ID, and read back', () => {
  assert.equal(linkMarkdown(target('npc', 'Ilona')), `[Ilona](npc:${ID})`)
  assert.equal(linkMarkdown(target('god', 'The [Masked] One')), `[The \\[Masked\\] One](god:${ID})`)
  assert.deepEqual(parseLinkHref(`npc:${ID}`), { kind: 'npc', id: ID })
  assert.deepEqual(parseLinkHref(`Character:${ID.toUpperCase()}`), { kind: 'character', id: ID })
  assert.equal(parseLinkHref('https://example.com'), null)
  assert.equal(parseLinkHref('npc:not-an-id'), null)
  assert.equal(parseLinkHref(`town:${ID}`), null)
  assert.equal(parseLinkHref(undefined), null)
  assert.equal(hasLinks(`We met [Ilona](npc:${ID}).`), true)
  assert.equal(hasLinks('See [the map](https://example.com).'), false)
})

test('A link to something unknown or unreadable finds no target (shown as plain text)', () => {
  const targets = [target('npc', 'Ilona'), target('god', 'Phenax', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')]
  assert.equal(findTarget(targets, `npc:${ID}`)?.name, 'Ilona')
  assert.equal(findTarget(targets, `character:${ID}`), null, 'same ID, other kind')
  assert.equal(findTarget(targets, 'npc:11111111-2222-4333-8444-555555555555'), null)
  assert.equal(findTarget(targets, 'https://example.com'), null)
})

test('@ opens the list at the start, after a space, a new line or a bracket; not in an e-mail address', () => {
  assert.deepEqual(mentionAt('@Il', 3), { start: 0, query: 'Il' })
  assert.deepEqual(mentionAt('We met @Ilo', 11), { start: 7, query: 'Ilo' })
  assert.deepEqual(mentionAt('line\n@', 6), { start: 5, query: '' })
  assert.deepEqual(mentionAt('(@Ph', 4), { start: 1, query: 'Ph' })
  assert.deepEqual(mentionAt('@Ilona the', 10), { start: 0, query: 'Ilona the' }, 'a space may be part of a name')
  assert.equal(mentionAt('mail me@home', 12), null)
  assert.equal(mentionAt('no at here', 5), null)
  assert.equal(mentionAt('@ Ilona', 7), null, 'a space straight after @')
  assert.equal(mentionAt('@Ilona\nnext', 11), null, 'a new line ends it')
  assert.equal(mentionAt(`[Ilona](npc:${ID}) and`, 50), null, 'an inserted link is not reopened')
  assert.equal(mentionAt(`@${'x'.repeat(41)}`, 42), null, 'too long')
  assert.deepEqual(mentionAt('@Il and more', 3), { start: 0, query: 'Il' }, 'only the text before the caret counts')
})

test('The @ list: starts-with first, then a word that starts with it, then contains; at most 8', () => {
  const targets = ['Kraan', 'Old Kraken', 'Akrabos', 'Phenax', 'Kruphix', 'Éphara'].map((name) => target('npc', name))
  assert.deepEqual(
    mentionMatches(targets, 'kr').map((t) => t.name),
    ['Kraan', 'Kruphix', 'Old Kraken', 'Akrabos'],
  )
  assert.deepEqual(mentionMatches(targets, 'eph').map((t) => t.name), ['Éphara'], 'accents ignored')
  assert.deepEqual(mentionMatches(targets, 'zz'), [])
  assert.equal(mentionMatches(targets, '').length, 6, 'an empty query offers everything, sorted')
  const many = Array.from({ length: 12 }, (_, i) => target('npc', `Guard ${i}`))
  assert.equal(mentionMatches(many, 'guard').length, 8)
})

test('Picking replaces the @… with the link and a space, and puts the caret after it', () => {
  const text = 'We met @Ilo at the docks'
  const result = insertMention(text, 7, 11, target('npc', 'Ilona'))
  const link = `[Ilona](npc:${ID}) `
  assert.equal(result.text, `We met ${link} at the docks`)
  assert.equal(result.caret, 7 + link.length)
})

test('The NPC list: sorted by name, filtered on name, role, location and faction, with a Hidden group for the DM', () => {
  const npc = (id: string, name: string, role = '', location = '', faction = '') => ({ id, name, role, location, faction })
  const list = [npc('1', 'zeno', 'Smith'), npc('2', 'Ilona', 'Oracle', 'Meletis', 'Temple of Ephara'), npc('3', 'Agape')]
  assert.deepEqual(groupNpcs(list, null).shown.map((n) => n.name), ['Agape', 'Ilona', 'zeno'])
  assert.deepEqual(groupNpcs(list, null).hidden, [])
  const dm = groupNpcs(list, new Set(['2']))
  assert.deepEqual(dm.hidden.map((n) => n.id), ['3', '1'])
  assert.deepEqual(dm.shown.map((n) => n.id), ['2'])

  assert.deepEqual(filterNpcs(list, 'meletis').map((n) => n.id), ['2'])
  assert.deepEqual(filterNpcs(list, 'éphara temple').map((n) => n.id), ['2'], 'every word, any order, accents ignored')
  assert.deepEqual(filterNpcs(list, 'smi').map((n) => n.id), ['1'])
  assert.equal(filterNpcs(list, '  ').length, 3)
  assert.equal(npcPlace(list[1]), 'Meletis · Temple of Ephara')
  assert.equal(npcPlace(list[0]), '')
})

test('Challenge ratings match the database: 0, 1/8, 1/4, 1/2, 1 to 30', () => {
  assert.equal(CR_VALUES.length, 34)
  assert.deepEqual(CR_VALUES.slice(0, 5), ['0', '1/8', '1/4', '1/2', '1'])
  assert.equal(CR_VALUES.at(-1), '30')
})
