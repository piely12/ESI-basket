import { json } from '@/lib/security'

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) return json({ error: 'unavailable' }, 503)
  return json({ publicKey }, 200, { 'Cache-Control': 'public, max-age=3600' })
}
