// Session list text (ARCHITECTURE.md 1.4).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatPlayedOn, notesSnippet } from '../src/lib/sessionText.ts'

test('Played-on dates read d MMM yyyy', () => {
  assert.equal(formatPlayedOn('2026-09-24'), '24 Sep 2026')
  assert.equal(formatPlayedOn('2027-01-05'), '5 Jan 2027')
})

test('The snippet is the first non-empty line, as plain text', () => {
  assert.equal(notesSnippet('\n\n## The **Siege** of _Akros_\nMore'), 'The Siege of Akros')
  assert.equal(notesSnippet('- Met [Anax](https://x.y) at the `gate`'), 'Met Anax at the gate')
  assert.equal(notesSnippet('1. First'), 'First')
  assert.equal(notesSnippet('> A quote'), 'A quote')
  assert.equal(notesSnippet(''), '')
})

test('The snippet is at most 80 characters', () => {
  const long = 'word '.repeat(40)
  const snippet = notesSnippet(long)
  assert.equal(snippet.length, 80)
  assert.ok(snippet.endsWith('…'))
  assert.equal(notesSnippet('x'.repeat(80)), 'x'.repeat(80))
})
