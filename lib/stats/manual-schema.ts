import { z } from 'zod'

const count = (max: number) => z.number().int().min(0).max(max).nullable()
const playerStats = z.object({
  player_id: z.string().uuid(), minutes_played: z.number().min(0).max(60).nullable(),
  points: count(150), personal_fouls: count(5), rebounds_defensive: count(100),
  rebounds_offensive: count(100), assists: count(100), steals: count(100),
  blocks: count(100), turnovers: count(100), fg_made: count(100), fg_attempted: count(150),
  three_made: count(100), three_attempted: count(150), ft_made: count(100), ft_attempted: count(150),
}).strict().superRefine((stats, context) => {
  if (stats.fg_made !== null && stats.fg_attempted !== null && stats.fg_made > stats.fg_attempted) {
    context.addIssue({ code: 'custom', path: ['fg_made'], message: 'made_exceeds_attempted' })
  }
  if (stats.three_made !== null && stats.three_attempted !== null && stats.three_made > stats.three_attempted) {
    context.addIssue({ code: 'custom', path: ['three_made'], message: 'made_exceeds_attempted' })
  }
  if (stats.ft_made !== null && stats.ft_attempted !== null && stats.ft_made > stats.ft_attempted) {
    context.addIssue({ code: 'custom', path: ['ft_made'], message: 'made_exceeds_attempted' })
  }
  if (stats.points !== null && stats.fg_made !== null && stats.three_made !== null && stats.ft_made !== null
    && stats.points !== 2 * stats.fg_made + stats.three_made + stats.ft_made) {
    context.addIssue({ code: 'custom', path: ['points'], message: 'points_total_inconsistent' })
  }
})

const teamStats = z.object({
  points: count(200), rebounds: count(200), assists: count(200), steals: count(200),
  blocks: count(200), turnovers: count(200), personal_fouls: count(200), fg_made: count(200),
  fg_attempted: count(300), three_made: count(200), three_attempted: count(300),
  ft_made: count(200), ft_attempted: count(300),
}).strict().superRefine((stats, context) => {
  if (stats.fg_made !== null && stats.fg_attempted !== null && stats.fg_made > stats.fg_attempted) {
    context.addIssue({ code: 'custom', path: ['fg_made'], message: 'made_exceeds_attempted' })
  }
  if (stats.three_made !== null && stats.three_attempted !== null && stats.three_made > stats.three_attempted) {
    context.addIssue({ code: 'custom', path: ['three_made'], message: 'made_exceeds_attempted' })
  }
  if (stats.ft_made !== null && stats.ft_attempted !== null && stats.ft_made > stats.ft_attempted) {
    context.addIssue({ code: 'custom', path: ['ft_made'], message: 'made_exceeds_attempted' })
  }
  if (stats.points !== null && stats.fg_made !== null && stats.three_made !== null && stats.ft_made !== null
    && stats.points !== 2 * stats.fg_made + stats.three_made + stats.ft_made) {
    context.addIssue({ code: 'custom', path: ['points'], message: 'points_total_inconsistent' })
  }
})

const saveSchema = z.object({
  action: z.literal('save'), esi_score: z.number().int().min(0).max(200).nullable(),
  opponent_score: z.number().int().min(0).max(200).nullable(), team: teamStats,
  players: z.array(playerStats).min(1).max(18),
}).strict().superRefine((payload, context) => {
  if ((payload.esi_score === null) !== (payload.opponent_score === null)) {
    context.addIssue({ code: 'custom', path: ['esi_score'], message: 'both_scores_required' })
  }
})

export const manualStatsActionSchema = z.discriminatedUnion('action', [
  saveSchema,
  z.object({ action: z.literal('save-collective'), home_score: z.number().int().min(0).max(200).nullable(), away_score: z.number().int().min(0).max(200).nullable(), home_team: teamStats, away_team: teamStats }).strict().superRefine((value, context) => {
    if ((value.home_score === null) !== (value.away_score === null)) context.addIssue({ code: 'custom', path: ['home_score'], message: 'both_scores_required' })
  }),
  z.object({ action: z.literal('prepare-review') }).strict(),
  z.object({ action: z.literal('validate-review'), result: z.boolean(), team: z.boolean(), players: z.boolean(), anomalies: z.boolean() }).strict(),
  z.object({ action: z.literal('publish') }).strict(),
  z.object({ action: z.literal('return-to-correction'), reason: z.string().trim().min(5).max(500) }).strict(),
  z.object({ action: z.literal('reopen'), reason: z.string().trim().min(5).max(500) }).strict(),
])
