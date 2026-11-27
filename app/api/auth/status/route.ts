import { json } from '@/lib/security'
import { limitPublicApiRead } from '@/lib/security/public-api-rate-limit'
import { serverEnv } from '@/lib/env'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic de l'envoi des codes par e-mail. Répond uniquement par oui/non :
 * aucune clé ni adresse n'est renvoyée.
 */
async function checkBrevo(apiKey: string, sender: string | undefined) {
  try {
    const res = await fetch('https://api.brevo.com/v3/senders', {
      headers: { 'api-key': apiKey, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { keyValid: false, senderVerified: false }
    const data = await res.json() as { senders?: { email?: string; active?: boolean }[] }
    const match = (data.senders ?? []).find((item) => item.email?.toLowerCase() === sender?.toLowerCase())
    return { keyValid: true, senderVerified: Boolean(match?.active) }
  } catch {
    return { keyValid: false, senderVerified: false }
  }
}

export async function GET(request: NextRequest) {
  const limited = await limitPublicApiRead(request)
  if (limited) return limited
  const apiKey = serverEnv('BREVO_API_KEY')
  const sender = serverEnv('BREVO_SENDER_EMAIL')
  const pepper = serverEnv('OTP_PEPPER')
  const brevo = apiKey ? await checkBrevo(apiKey, sender) : { keyValid: false, senderVerified: false }
  const status = {
    otpPepper: Boolean(pepper && pepper.length >= 16),
    brevoApiKey: Boolean(apiKey),
    brevoKeyValid: brevo.keyValid,
    brevoSenderEmail: Boolean(sender),
    brevoSenderVerified: brevo.senderVerified,
  }
  return json({ canSendCodes: Object.values(status).every(Boolean), ...status }, 200, { 'Cache-Control': 'no-store' })
}
