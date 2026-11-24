import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildMatchReminderPayload,
  formatMatchTime,
  withArticle,
} from '../lib/push/match-reminder.ts'

test('le message suit le format demandé par le club', () => {
  const payload = buildMatchReminderPayload([{
    id: 'abc-123',
    scheduledAt: '2026-12-05T18:00:00Z',
    opponent: 'ESCAE',
    location: 'Gymnase du Sud',
  }])
  assert.equal(payload.title, 'Jour de Match à ESI Land.')
  assert.equal(payload.body, 'Les Lions affrontent l’ESCAE à 18h')
  assert.equal(payload.url, '/matchs/abc-123#composition')
})

test('l’heure est affichée à la française, minutes seulement si besoin', () => {
  assert.equal(formatMatchTime('2026-12-05T18:00:00Z'), '18h')
  assert.equal(formatMatchTime('2026-12-05T17:30:00Z'), '17h30')
  assert.equal(formatMatchTime('2026-12-05T09:00:00Z'), '9h')
})

test('les noms d’équipe sont accordés', () => {
  assert.equal(withArticle('E. Projet'), 'l’E. Projet')
  assert.equal(withArticle('Lycée Moderne'), 'Lycée Moderne')
})

test('deux matchs le même jour, ou adversaire inconnu', () => {
  const payload = buildMatchReminderPayload([
    { id: 'a', scheduledAt: '2026-12-05T16:00:00Z', opponent: 'ESTP', location: null },
    { id: 'b', scheduledAt: '2026-12-05T18:30:00Z', opponent: null, location: null },
  ])
  assert.equal(payload.body, 'Les Lions affrontent l’ESTP à 16h · Les Lions affrontent leur adversaire à 18h30')
  assert.equal(payload.url, '/matchs/a#composition')
})
