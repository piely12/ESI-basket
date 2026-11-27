import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Pseudo du joueur connecté (lecture protégée par RLS). Null si absent ou si la migration 041 n'est pas appliquée. */
export async function getOwnPseudo(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('player_pseudos').select('pseudo').eq('user_id', userId).maybeSingle()
  return error ? null : (data?.pseudo as string | undefined) ?? null
}
