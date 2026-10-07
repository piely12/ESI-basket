'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAnyRole } from '@/lib/auth/requireUser'

export type EditorialState = { error: string; success: string }
const UUID = z.string().uuid()
const ARTICLE = z.object({
  title: z.string().trim().min(5).max(120),
  excerpt: z.string().trim().max(220),
  body: z.string().trim().min(30).max(20000),
  category: z.string().trim().max(40),
  cover_url: z.string().trim().max(2048),
  media_url: z.string().trim().max(2048),
  media_type: z.enum(['image', 'video']),
}).strict()
const ARTICLE_EDIT = z.object({
  id: UUID,
  title: z.string().trim().min(5).max(120),
  excerpt: z.string().trim().max(220),
  body: z.string().trim().min(30).max(20000),
  category: z.string().trim().max(40),
  cover_url: z.string().trim().max(2048),
}).strict()
const MVP = z.object({ match_id: UUID, player_id: UUID, headline: z.string().trim().max(120) }).strict()

function validWebUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
  } catch { return false }
}

async function editorContext() {
  const { supabase, user, profile } = await requireAnyRole(['videaste', 'admin'])
  let teamId = profile.team_id
  if (!teamId) {
    const { data: esi } = await supabase.from('teams').select('id').eq('is_esi', true).maybeSingle()
    teamId = esi?.id ?? null
  }
  if (!teamId) throw new Error('Équipe ESI introuvable.')
  const { data: team } = await supabase.from('teams').select('is_esi').eq('id', teamId).maybeSingle()
  if (!team?.is_esi) throw new Error('Espace éditorial réservé à l’équipe ESI.')
  return { supabase, user, teamId }
}

async function writeEditorialAudit(action: string, userId: string, entityId: string, metadata: Record<string, unknown> = {}) {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      actor_user_id: userId, action, entity_type: 'news', entity_id: entityId, metadata,
    })
  } catch {
    // Le contenu reste enregistré même si le service d’audit est indisponible.
  }
}

export async function createNewsArticle(
  _previous: EditorialState,
  formData: FormData,
): Promise<EditorialState> {
  const { supabase, user } = await editorContext()
  const parsed = ARTICLE.safeParse({
    title: formData.get('title'), excerpt: formData.get('excerpt') ?? '',
    body: formData.get('body'), category: formData.get('category') ?? '',
    cover_url: formData.get('cover_url') ?? '', media_url: formData.get('media_url') ?? '',
    media_type: formData.get('media_type') ?? 'image',
  })
  if (!parsed.success) return { error: 'Vérifie le titre, le texte et les champs du formulaire.', success: '' }
  const article = parsed.data
  if (!validWebUrl(article.cover_url) || !validWebUrl(article.media_url)) {
    return { error: 'Le lien média doit être une adresse HTTP ou HTTPS valide.', success: '' }
  }
  if (article.media_url && !article.cover_url && article.media_type === 'image') article.cover_url = article.media_url

  const { data, error } = await supabase.from('news').insert({
    title: article.title, excerpt: article.excerpt || null, body: article.body,
    category: article.category || null, cover_url: article.cover_url || null,
    is_published: false, published_at: null, author_id: user.id,
  }).select('id').single()
  if (error || !data) return { error: 'Impossible d’enregistrer l’article. Vérifie les informations puis réessaie.', success: '' }

  if (article.media_url) {
    const { error: mediaError } = await supabase.from('news_media').insert({
      news_id: data.id, media_url: article.media_url, media_type: article.media_type,
      caption: article.title, sort_order: 0,
    })
    if (mediaError) {
      await writeEditorialAudit('news_draft_created_media_failed', user.id, data.id)
      revalidatePath('/actus')
      return { error: 'Le brouillon est enregistré, mais le média n’a pas été associé. Réessaie avec un lien public.', success: '' }
    }
  }

  await writeEditorialAudit('news_draft_created', user.id, data.id, { category: article.category || null })
  revalidatePath('/actus')
  revalidatePath('/actualites')
  return { error: '', success: 'Brouillon enregistré. Tu peux le publier depuis la liste.' }
}

export async function setNewsPublished(newsId: string, publish: boolean) {
  const { supabase, user } = await editorContext()
  if (!UUID.safeParse(newsId).success) throw new Error('Article introuvable.')
  const { data, error } = await supabase.from('news').update({
    is_published: publish, published_at: publish ? new Date().toISOString() : null,
  }).eq('id', newsId).select('id').maybeSingle()
  if (error || !data) throw new Error('Impossible de modifier la publication de cet article.')
  await writeEditorialAudit(publish ? 'news_published' : 'news_unpublished', user.id, newsId)
  revalidatePath('/actus')
  revalidatePath('/actualites')
}

export async function updateNewsArticle(
  _previous: EditorialState,
  formData: FormData,
): Promise<EditorialState> {
  const { supabase, user } = await editorContext()
  const parsed = ARTICLE_EDIT.safeParse({
    id: formData.get('id'), title: formData.get('title'),
    excerpt: formData.get('excerpt') ?? '', body: formData.get('body'),
    category: formData.get('category') ?? '', cover_url: formData.get('cover_url') ?? '',
  })
  if (!parsed.success) return { error: 'Vérifie le titre, le texte et les champs du formulaire.', success: '' }
  if (!validWebUrl(parsed.data.cover_url)) return { error: 'Le lien de couverture doit être une adresse HTTP ou HTTPS valide.', success: '' }
  const { id, ...fields } = parsed.data
  const { data, error } = await supabase.from('news').update({
    title: fields.title, excerpt: fields.excerpt || null, body: fields.body,
    category: fields.category || null, cover_url: fields.cover_url || null,
    is_published: false, published_at: null,
  }).eq('id', id).select('id').maybeSingle()
  if (error || !data) return { error: 'Impossible de modifier cet article.', success: '' }
  await writeEditorialAudit('news_updated_and_unpublished', user.id, id)
  revalidatePath('/actus')
  revalidatePath('/actualites')
  return { error: '', success: 'Article modifié et replacé en brouillon. Publie-le après relecture.' }
}

export async function deleteNewsArticle(newsId: string) {
  const { supabase, user } = await editorContext()
  if (!UUID.safeParse(newsId).success) throw new Error('Article introuvable.')
  const { data, error } = await supabase.from('news').delete().eq('id', newsId).select('id').maybeSingle()
  if (error || !data) throw new Error('Impossible de supprimer cet article.')
  await writeEditorialAudit('news_deleted', user.id, newsId)
  revalidatePath('/actus')
  revalidatePath('/actualites')
}

export async function saveMvpAward(
  _previous: EditorialState,
  formData: FormData,
): Promise<EditorialState> {
  const { supabase, user, teamId } = await editorContext()
  const parsed = MVP.safeParse({
    match_id: formData.get('match_id'), player_id: formData.get('player_id'),
    headline: formData.get('headline') ?? '',
  })
  if (!parsed.success) return { error: 'Choisis le match et le joueur MVP.', success: '' }
  const { match_id: matchId, player_id: playerId, headline } = parsed.data
  const { data: match } = await supabase.from('matches').select('id,scheduled_at,home_team_id,away_team_id,status')
    .eq('id', matchId).eq('status', 'termine').or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).maybeSingle()
  if (!match) return { error: 'Ce match terminé n’est pas un match ESI.', success: '' }
  const { data: latest } = await supabase.from('matches').select('id')
    .eq('status', 'termine').or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('scheduled_at', { ascending: false }).limit(1).maybeSingle()
  if (latest?.id !== matchId) return { error: 'Le MVP mis en avant doit être celui du dernier match ESI terminé.', success: '' }
  const { data: player } = await supabase.from('players').select('id').eq('id', playerId).eq('team_id', teamId).maybeSingle()
  if (!player) return { error: 'Ce joueur ne fait pas partie de l’effectif ESI.', success: '' }
  const { data: publishedStat } = await supabase.from('match_player_stats').select('player_id')
    .eq('match_id', matchId).eq('player_id', playerId).not('published_at', 'is', null).maybeSingle()
  if (!publishedStat) return { error: 'Le MVP doit avoir une statistique publiée pour ce match.', success: '' }

  const { data: existingAward, error: lookupError } = await supabase.from('mvp_awards')
    .select('id').eq('match_id', matchId).maybeSingle()
  if (lookupError) return { error: 'Impossible de charger le MVP actuel.', success: '' }
  const publishedAt = new Date().toISOString()
  const { data: award, error } = existingAward
    ? await supabase.from('mvp_awards').update({ player_id: playerId, headline: headline || null, published_at: publishedAt })
      .eq('id', existingAward.id).select('id').single()
    : await supabase.from('mvp_awards').insert({
      match_id: matchId, player_id: playerId, headline: headline || null,
      published_at: publishedAt, created_by: user.id,
    }).select('id').single()
  if (error || !award) return { error: 'Impossible d’enregistrer le MVP. Vérifie les droits de publication.', success: '' }
  await writeEditorialAudit('mvp_award_published', user.id, award.id, { match_id: matchId, player_id: playerId })
  revalidatePath('/actus')
  revalidatePath('/actualites')
  revalidatePath('/')
  return { error: '', success: 'MVP enregistré et visible sur la page Actualités.' }
}

export async function clearMvpAward(matchId: string) {
  const { supabase, user, teamId } = await editorContext()
  if (!UUID.safeParse(matchId).success) throw new Error('Match invalide.')
  const { data: match } = await supabase.from('matches').select('id')
    .eq('id', matchId).or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).maybeSingle()
  if (!match) throw new Error('Match ESI introuvable.')
  const { data: award, error } = await supabase.from('mvp_awards').delete().eq('match_id', matchId).select('id').maybeSingle()
  if (error) throw new Error('Impossible de retirer le MVP.')
  if (award) await writeEditorialAudit('mvp_award_removed', user.id, award.id, { match_id: matchId })
  revalidatePath('/actus')
  revalidatePath('/actualites')
  revalidatePath('/')
}
