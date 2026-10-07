import assert from 'node:assert/strict'
import test from 'node:test'
import { manualStatsActionSchema } from '../lib/stats/manual-schema.ts'

const blankPlayer = () => ({
  player_id: 'a184725c-1a2b-4efc-9b24-2410372ab764', minutes_played: null, points: null,
  personal_fouls: null, rebounds_defensive: null, rebounds_offensive: null, assists: null,
  steals: null, blocks: null, turnovers: null, fg_made: null, fg_attempted: null,
  three_made: null, three_attempted: null, ft_made: null, ft_attempted: null,
})
const blankTeam = () => ({
  points: null, rebounds: null, assists: null, steals: null, blocks: null, turnovers: null,
  personal_fouls: null, fg_made: null, fg_attempted: null, three_made: null,
  three_attempted: null, ft_made: null, ft_attempted: null,
})
const payload = () => ({ action: 'save', esi_score: null, opponent_score: null, team: blankTeam(), players: [blankPlayer()] })

test('partial manual draft preserves null instead of replacing it with zero', () => {
  const draft = payload()
  draft.team.rebounds = 0
  draft.players[0].points = 0
  const parsed = manualStatsActionSchema.safeParse(draft)
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.team.rebounds, 0)
    assert.equal(parsed.data.players[0].points, 0)
    assert.equal(parsed.data.team.assists, null)
  }
})

test('made field goals cannot exceed attempts', () => {
  const draft = payload()
  draft.players[0].fg_made = 3
  draft.players[0].fg_attempted = 2
  assert.equal(manualStatsActionSchema.safeParse(draft).success, false)
})

test('completed shooting line must match player points', () => {
  const draft = payload()
  Object.assign(draft.players[0], { points: 8, fg_made: 2, fg_attempted: 4, three_made: 1, three_attempted: 2, ft_made: 1, ft_attempted: 2 })
  assert.equal(manualStatsActionSchema.safeParse(draft).success, false)
})

test('score fields must both be entered or both stay empty', () => {
  const draft = payload()
  draft.esi_score = 0
  assert.equal(manualStatsActionSchema.safeParse(draft).success, false)
})

test('legacy plus-minus input is rejected by the strict schema', () => {
  const draft = payload()
  draft.players[0].plus_minus = 3
  assert.equal(manualStatsActionSchema.safeParse(draft).success, false)
})
