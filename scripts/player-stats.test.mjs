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

import { LEADER_STATS, buildLeaderPlayer, rankLeaders } from '../lib/stats/team-leaders.ts'
import { marginChart, signed } from '../lib/stats/season-review.ts'

const player = (name, average, shooting = {}) => ({
  id: name, name, position: 'Ailier', games: 5,
  average: { points: 0, assists: 0, rebounds: 0, blocks: 0, steals: 0, ...average },
  shooting: {
    fieldGoals: { made: 0, attempted: 0 }, twoPoints: { made: 0, attempted: 0 },
    threePoints: { made: 0, attempted: 0 }, freeThrows: { made: 0, attempted: 0 }, ...shooting,
  },
})
const team = [
  player('Kocla', { points: 14.2, assists: 1.6, rebounds: 7.4 }, { threePoints: { made: 3, attempted: 9 }, freeThrows: { made: 12, attempted: 19 } }),
  player('Amon', { points: 13.5, assists: 2.8, rebounds: 4.3 }, { threePoints: { made: 6, attempted: 15 }, freeThrows: { made: 10, attempted: 12 } }),
  player('Botchi', { points: 7.4, assists: 4.6, rebounds: 3.0 }, { threePoints: { made: 5, attempted: 14 }, freeThrows: { made: 6, attempted: 8 } }),
  player('Yoboue', { points: 6.8, assists: 1.2, rebounds: 8.0 }, { threePoints: { made: 2, attempted: 7 }, freeThrows: { made: 6, attempted: 9 } }),
  player('Gbago', { points: 5.6, assists: 2.0, rebounds: 4.0 }, { threePoints: { made: 3, attempted: 10 }, freeThrows: { made: 5, attempted: 8 } }),
  player('Famien', { points: 9.8, assists: 0.8, rebounds: 6.6 }, { threePoints: { made: 0, attempted: 2 }, freeThrows: { made: 9, attempted: 15 } }),
]
const names = (rows) => rows.map((row) => row.player.name)

test('average leaders are ranked on the per-game value', () => {
  assert.deepEqual(names(rankLeaders(team, 'points', 'made')), ['Kocla', 'Amon', 'Famien'])
  assert.deepEqual(names(rankLeaders(team, 'assists', 'made')), ['Botchi', 'Amon', 'Gbago'])
  assert.deepEqual(names(rankLeaders(team, 'rebounds', 'made')), ['Yoboue', 'Kocla', 'Famien'])
})

test('shooting leaders rank on made shots, or on percentage with a minimum of attempts', () => {
  assert.deepEqual(names(rankLeaders(team, 'threePoints', 'made')), ['Amon', 'Botchi', 'Kocla'])
  const byPercent = rankLeaders(team, 'threePoints', 'pct')
  assert.deepEqual(names(byPercent), ['Amon', 'Botchi', 'Kocla'])
  assert.equal(Math.round(byPercent[0].value), 40)
  assert.deepEqual(names(rankLeaders(team, 'freeThrows', 'pct')), ['Amon', 'Botchi', 'Yoboue'])
})

test('a player below the minimum attempts is left out of a percentage ranking', () => {
  assert.equal(rankLeaders(team, 'threePoints', 'pct').some((row) => row.player.name === 'Famien'), false)
  assert.deepEqual(rankLeaders([], 'points', 'made'), [])
})

test('every menu entry is a known statistic', () => {
  assert.equal(LEADER_STATS.length, 9)
  for (const def of LEADER_STATS) assert.doesNotThrow(() => rankLeaders(team, def.key, 'pct'))
})

test('a leader summary averages match lines and skips players without a match', () => {
  const lines = [toLine(raw({ points: 14, fg_made: 5, fg_attempted: 11, three_made: 1, three_attempted: 3 })), toLine(raw({ points: 9, fg_made: 3, fg_attempted: 8, three_made: 1, three_attempted: 3 }))]
  const summary = buildLeaderPlayer({ id: 'a', name: 'Amon', position: 'Meneur' }, lines)
  assert.equal(summary.games, 2)
  assert.equal(summary.face, null)
  assert.equal(buildLeaderPlayer({ id: 'c', name: 'Kocla', position: 'Pivot', face: '/visages/visage_9.webp' }, lines).face, '/visages/visage_9.webp')
  assert.equal(summary.average.points, 11.5)
  assert.deepEqual(summary.shooting.twoPoints, { made: 6, attempted: 13 })
  assert.equal(buildLeaderPlayer({ id: 'b', name: 'Bench', position: 'Ailier' }, []), null)
})

test('margins are signed with a French decimal comma', () => {
  assert.equal(signed(8.8, 1), '+8,8')
  assert.equal(signed(-4), '−4')
  assert.equal(signed(0), '0')
})

test('margin chart grows wins upward and losses downward to one common scale', () => {
  const chart = marginChart([16, 9, -4, 11, 12])
  assert.equal(chart.bars.length, 5)
  assert.ok(chart.bars[0].height > chart.bars[1].height)
  assert.equal(chart.bars[0].y + chart.bars[0].height, chart.zeroY)
  assert.equal(chart.bars[2].y, chart.zeroY)
  assert.ok(chart.height > chart.zeroY + chart.bars[2].height)
  assert.equal(marginChart([]).bars.length, 0)
})
