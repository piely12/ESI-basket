import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyLine, formatAverage, percentOf, sumLines, toLine } from '../lib/stats/player-stats.ts'
import { buildRadar } from '../lib/stats/player-radar.ts'

const raw = (over = {}) => ({
  points: null, rebounds: null, rebounds_offensive: null, rebounds_defensive: null, assists: null, steals: null,
  blocks: null, turnovers: null, personal_fouls: null, fg_made: null, fg_attempted: null, three_made: null,
  three_attempted: null, ft_made: null, ft_attempted: null, ...over,
})

test('empty values become zero and two-pointers are field goals minus threes', () => {
  const line = toLine(raw({ fg_made: 5, fg_attempted: 11, three_made: 1, three_attempted: 3 }))
  assert.equal(line.points, 0)
  assert.equal(line.twoMade, 4)
  assert.equal(line.twoAttempted, 8)
})

test('rebounds fall back to offensive plus defensive when the total is missing', () => {
  assert.equal(toLine(raw({ rebounds_offensive: 1, rebounds_defensive: 3 })).rebounds, 4)
  assert.equal(toLine(raw({ rebounds: 6, rebounds_offensive: 1, rebounds_defensive: 3 })).rebounds, 6)
})

test('season totals add every match line', () => {
  const total = sumLines([toLine(raw({ points: 14, fg_made: 5, fg_attempted: 11 })), toLine(raw({ points: 9, fg_made: 3, fg_attempted: 8 }))])
  assert.equal(total.points, 23)
  assert.equal(total.fgMade, 8)
  assert.equal(total.fgAttempted, 19)
  assert.deepEqual(sumLines([]), emptyLine())
})

test('averages use a French decimal comma and percentages ignore empty shooting', () => {
  assert.equal(formatAverage(13.5), '13,5')
  assert.equal(formatAverage(4.25), '4,3')
  assert.equal(formatAverage(0), '0,0')
  assert.equal(percentOf(19, 43), 44)
  assert.equal(percentOf(0, 0), null)
})

const row = (player_id, over = {}) => ({ player_id, match_id: Math.random().toString(), points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fg_made: 0, fg_attempted: 0, ...over })

test('radar compares a player with the best of the team', () => {
  const radar = buildRadar('a', [
    row('a', { points: 10, rebounds: 4, assists: 2, steals: 1, blocks: 1, fg_made: 4, fg_attempted: 10 }),
    row('b', { points: 20, rebounds: 4, assists: 6, steals: 0, blocks: 0, fg_made: 8, fg_attempted: 10 }),
  ])
  assert.ok(radar)
  assert.deepEqual(radar.player.map((v) => Math.round(v * 100)), [50, 100, 33, 100, 50])
  assert.deepEqual(radar.team.map((v) => Math.round(v * 100)), [75, 100, 67, 50, 75])
})

test('radar is hidden without teammates or without the player', () => {
  assert.equal(buildRadar('a', [row('a', { points: 3 })]), null)
  assert.equal(buildRadar('z', [row('a'), row('b')]), null)
})
