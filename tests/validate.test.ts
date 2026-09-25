// Form checks for email and password login (ARCHITECTURE.md 1.7).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emailProblem, nameProblem, normalizeEmail, normalizeName, passwordProblem } from '../src/lib/validate.ts'

test('Emails are trimmed and lower-cased, and must look like an address', () => {
  assert.equal(normalizeEmail('  Anna@Mail.COM '), 'anna@mail.com')
  assert.equal(emailProblem(' anna@mail.com '), null)
  for (const bad of ['', '   ', 'anna', 'anna@mail', '@mail.com', 'an na@mail.com', `${'a'.repeat(250)}@mail.com`]) {
    assert.ok(emailProblem(bad), `accepted ${JSON.stringify(bad)}`)
  }
})

test('Display names are trimmed and 1 to 40 characters', () => {
  assert.equal(normalizeName('  Anna   de  Vries '), 'Anna de Vries')
  assert.equal(nameProblem('Anna'), null)
  assert.ok(nameProblem('   '))
  assert.ok(nameProblem('x'.repeat(41)))
})

test('Passwords: at least 8 characters, at most 72 bytes, and both typed the same', () => {
  assert.equal(passwordProblem('correct horse', 'correct horse'), null)
  assert.ok(passwordProblem('short', 'short'))
  assert.ok(passwordProblem('correct horse', 'correct horsE'))
  assert.ok(passwordProblem('é'.repeat(37), 'é'.repeat(37)), '74 bytes')
})
