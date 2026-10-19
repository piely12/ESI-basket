// Remove the retired editorial-media bucket through Supabase Storage's API.
// Never delete storage.objects rows with SQL: that leaves physical files orphaned.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.')
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const bucket = 'news-media'

const { data, error: lookupError } = await supabase.storage.getBucket(bucket)
if (lookupError && lookupError.statusCode !== '404') throw lookupError

if (!data) {
  console.log(`Storage bucket ${bucket} already removed.`)
} else {
  const { error: emptyError } = await supabase.storage.emptyBucket(bucket)
  if (emptyError) throw emptyError

  const { error: deleteError } = await supabase.storage.deleteBucket(bucket)
  if (deleteError) throw deleteError
  console.log(`Storage bucket ${bucket} and its files removed.`)
}
