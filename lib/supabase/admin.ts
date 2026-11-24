import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Clé service_role. Accepte aussi le nom en minuscules, utilisé sur Vercel,
 * et retire les espaces ou sauts de ligne collés par erreur avec la valeur.
 */
export function serviceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key || '').trim()
}

// Client service_role : ignore la RLS. Uniquement dans les Route Handlers serveur.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = serviceRoleKey()
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
