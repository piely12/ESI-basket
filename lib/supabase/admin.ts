import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Client service_role : ignore la RLS. Uniquement dans les Route Handlers serveur.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
