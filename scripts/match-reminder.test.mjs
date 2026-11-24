import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildMatchReminderPayload,
  formatMatchTime,
  formatVenue,
  withArticle,
} from '../lib/push/match-reminder.ts'

test('le message suit le format demandé par le club', () => {
  const payload = buildMatchReminderPayload([{
    id: 'abc-123',
    scheduledAt: '2026-12-05T18:00:00Z',
    opponent: 'ESCAE',
    location: 'Gymnase du Sud',
  }])
  assert.equal(payload.title, 'Jour de match à ESI-Land.')
  assert.equal(payload.body, 'Les Lions 🦁 de l’ESI affrontent l’ESCAE à 18h au gymnase du Sud.')
  assert.equal(payload.url, '/matchs/abc-123#composition')
})

test('l’heure est affichée à la française, minutes seulement si besoin', () => {
  assert.equal(formatMatchTime('2026-12-05T18:00:00Z'), '18h')
  assert.equal(formatMatchTime('2026-12-05T17:30:00Z'), '17h30')
  assert.equal(formatMatchTime('2026-12-05T09:00:00Z'), '9h')
})

test('les noms d’équipe et les lieux sont accordés', () => {
  assert.equal(withArticle('E. Projet'), 'l’E. Projet')
  assert.equal(withArticle('Lycée Moderne'), 'Lycée Moderne')
  assert.equal(formatVenue('Palais des sports'), 'au palais des sports')
  assert.equal(formatVenue('Salle omnisports'), 'à la salle omnisports')
  assert.equal(formatVenue('Cocody'), 'à Cocody')
})

test('sans lieu ni adversaire, la phrase reste correcte', () => {
  const payload = buildMatchReminderPayload([{ id: 'x', scheduledAt: '2026-12-05T18:00:00Z', opponent: null, location: null }])
  assert.equal(payload.body, 'Les Lions 🦁 de l’ESI affrontent leur adversaire à 18h.')
})
