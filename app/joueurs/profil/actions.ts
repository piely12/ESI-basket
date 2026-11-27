'use server'

import { revalidatePath } from 'next/cache'
import { requireAnyRole } from '@/lib/auth/requireUser'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePseudo, pseudoKey, validatePseudo } from '@/lib/validation'

export type PseudoState = { ok?: boolean; error?: string }

export async function updatePseudo(_previous: PseudoState, formData: FormData): Promise<PseudoState> {
  const { user } = await requireAnyRole(['joueur'])
  const pseudo = normalizePseudo(String(formData.get('pseudo') ?? ''))
  const problem = validatePseudo(pseudo)
  if (problem) return { error: problem }
  const admin = createAdminClient()
  const { data: owner, error: ownerError } = await admin.from('player_pseudos').select('user_id')
    .ilike('pseudo', pseudoKey(pseudo).replace(/[\\%_]/g, '\\$&')).maybeSingle()
  if (ownerError) return { error: 'Pseudo indisponible pour le moment. Réessaie.' }
  if (owner && owner.user_id !== user.id) return { error: 'Ce pseudo est déjà pris.' }
  const { error } = await admin.from('player_pseudos').upsert({ user_id: user.id, pseudo, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return { error: error.code === '23505' ? 'Ce pseudo est déjà pris.' : 'Pseudo indisponible pour le moment. Réessaie.' }
  revalidatePath('/joueurs', 'layout')
  return { ok: true }
}
