import { NextRequest } from 'next/server'
import { getMatchesPage, MATCHES_PAGE_SIZE } from '@/lib/data/public'
import { json } from '@/lib/security'
import { limitPublicApiRead } from '@/lib/security/public-api-rate-limit'

export async function GET(request: NextRequest) {
  const limited = await limitPublicApiRead(request)
  if (limited) return limited

  const rawOffset = Number(request.nextUrl.searchParams.get('offset') ?? 0)
  if (!Number.isInteger(rawOffset) || rawOffset < 0 || rawOffset > 100_000) {
    return json({ error: 'Le numéro de page est invalide.' }, 400)
  }

  try {
    const page = await getMatchesPage(rawOffset, MATCHES_PAGE_SIZE)
    return json(page)
  } catch {
    return json({ error: 'Impossible de charger les matchs pour le moment.' }, 503)
  }
}
