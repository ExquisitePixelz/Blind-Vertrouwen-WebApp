// The rest of World (ARCHITECTURE.md 1.14).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasLinks, linkMarkdown, parseLinkHref } from '../src/lib/links.ts'
import {
  WORLD_KINDS,
  entryPath,
  filterEntries,
  kindBySegment,
  partOfOptions,
  placeChain,
  placesInside,
  typeLabel,
  typesFor,
} from '../src/lib/world.ts'

const ID = '3f2a8c4e-1b2d-4e5f-8a9b-0c1d2e3f4a5b'
const place = (id: string, name: string, parent_id: string | null = null) => ({ id, name, parent_id })

test('Five kinds, each with its own address; places and lore have types, the rest none', () => {
  assert.deepEqual(WORLD_KINDS.map((k) => k.plural), ['Places', 'Factions', 'Lore', 'Creatures', 'Items'])
  assert.equal(entryPath('place', ID), `/world/places/${ID}`)
  assert.equal(kindBySegment('creatures')?.kind, 'creature')
  assert.equal(kindBySegment('npcs'), undefined)
  assert.deepEqual(typesFor('place').map((t) => t.value), ['region', 'city', 'town', 'village', 'building', 'dungeon', 'other'])
  assert.deepEqual(typesFor('lore').map((t) => t.value), ['history', 'legend', 'prophecy', 'event', 'other'])
  assert.deepEqual(typesFor('faction'), [])
  assert.equal(typeLabel('place', 'city'), 'City')
  assert.equal(typeLabel('item', null), '')
})

test('The chain up: nearest first, stopping at an unseen place, never looping', () => {
  const places = [place('region', 'Akros region'), place('city', 'Akros', 'region'), place('temple', 'Temple', 'city')]
  assert.deepEqual(placeChain(places, 'temple').map((p) => p.id), ['city', 'region'])
  assert.deepEqual(placeChain(places, 'region'), [])
  assert.deepEqual(placeChain([place('a', 'A', 'hidden')], 'a'), [], 'a parent the reader cannot see')
  const loop = [place('a', 'A', 'b'), place('b', 'B', 'a')]
  assert.deepEqual(placeChain(loop, 'a').map((p) => p.id), ['b'], 'bad data does not hang')
})

test('Inside lists the direct parts by name; Part of never offers the place itself or what is inside it', () => {
  const places = [
    place('meletis', 'Meletis'),
    place('temple', 'Temple of Ephara', 'meletis'),
    place('agora', 'Agora', 'meletis'),
    place('crypt', 'Crypt', 'temple'),
    place('akros', 'Akros'),
  ]
  assert.deepEqual(placesInside(places, 'meletis').map((p) => p.id), ['agora', 'temple'])
  assert.deepEqual(placesInside(places, 'crypt'), [])
  assert.deepEqual(partOfOptions(places, 'meletis').map((p) => p.id), ['akros'])
  assert.deepEqual(partOfOptions(places, 'temple').map((p) => p.id), ['agora', 'akros', 'meletis'])
})

test('The filter: words in the name or summary, and the type chip', () => {
  const entries = [
    { name: 'Meletis', summary: 'City of philosophers', type: 'city' },
    { name: 'Akros', summary: 'Warrior city', type: 'city' },
    { name: 'The Salty Oar', summary: 'Tavern in Meletis', type: 'building' },
  ]
  assert.deepEqual(filterEntries(entries, 'meletis').map((e) => e.name), ['Meletis', 'The Salty Oar'])
  assert.deepEqual(filterEntries(entries, '', 'city').map((e) => e.name), ['Meletis', 'Akros'])
  assert.deepEqual(filterEntries(entries, 'meletis', 'building').map((e) => e.name), ['The Salty Oar'])
  assert.equal(filterEntries(entries, '  ').length, 3)
})

test('Links work for the new kinds', () => {
  for (const kind of ['place', 'faction', 'lore', 'creature', 'item'] as const) {
    const md = linkMarkdown({ kind, id: ID, name: 'X' })
    assert.equal(md, `[X](${kind}:${ID})`)
    assert.deepEqual(parseLinkHref(`${kind}:${ID}`), { kind, id: ID })
    assert.equal(hasLinks(`See ${md}.`), true)
  }
  assert.equal(parseLinkHref(`town:${ID}`), null)
  assert.equal(hasLinks('[x](https://example.com)'), false)
})
