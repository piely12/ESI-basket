import assert from 'node:assert/strict'
import test from 'node:test'
import { PASSWORD_RULES, normalizePseudo, pseudoKey, validateNewPassword, validatePseudo } from '../lib/validation.ts'

test('a password needs 8 characters, upper case, lower case, a digit and a symbol', () => {
  assert.equal(validateNewPassword('Lions#26'), null)
  assert.match(validateNewPassword('Ab#1'), /Au moins 8/)
  assert.match(validateNewPassword('lions#26'), /majuscule/)
  assert.match(validateNewPassword('LIONS#26'), /minuscule/)
  assert.match(validateNewPassword('Lions#abc'), /chiffre/)
  assert.match(validateNewPassword('Lions2026'), /caractère spécial/)
})

test('a password is limited to 72 bytes and may not echo the e-mail or the name', () => {
  assert.match(validateNewPassword('Aa1#' + 'x'.repeat(80)), /Au plus 72/)
  assert.match(validateNewPassword('Alexandre#12', 'alexandre@exemple.ci'), /e-mail/)
  assert.match(validateNewPassword('Kocla#2026x', undefined, 'KOCLA ALEX'), /nom/)
  assert.match(validateNewPassword('Password1!'), /courant/)
})

test('the live checklist matches the server rules', () => {
  const pass = (value) => PASSWORD_RULES.every((rule) => rule.test(value))
  assert.equal(pass('Lions#26'), true)
  assert.equal(pass('lions#26'), false)
  assert.equal(PASSWORD_RULES.length, 5)
})

test('a pseudo is a short display name without spaces', () => {
  for (const ok of ['Alex', 'alex_24', 'Kocla.9', 'Jean-Loïc', 'Zé12']) assert.equal(validatePseudo(ok), null, ok)
  assert.match(validatePseudo('al'), /Au moins 3/)
  assert.match(validatePseudo('a'.repeat(21)), /Au plus 20/)
  assert.match(validatePseudo('Alex Kocla'), /espace/)
  assert.match(validatePseudo('_alex'), /Lettres/)
  assert.match(validatePseudo('alex@esi'), /Lettres/)
  assert.match(validatePseudo('123456'), /lettre/)
  assert.match(validatePseudo('Admin'), /réservé/)
  assert.match(validatePseudo('Équipe'), /réservé/)
})

test('pseudos are compared without case and surrounding spaces', () => {
  assert.equal(normalizePseudo('  Alex '), 'Alex')
  assert.equal(pseudoKey(' ALEX '), pseudoKey('alex'))
  assert.equal(normalizePseudo(undefined), '')
})
