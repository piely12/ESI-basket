import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { consumeRateLimit, rlKey } from '@/lib/security'

export const BREVO_DAILY_APP_LIMIT = 270
export const BREVO_DAILY_WARNING_LIMIT = 240

async function reserveDailyEmail() {
  const admin = createAdminClient()
  const day = new Date().toISOString().slice(0, 10)
  const reservation = await consumeRateLimit(admin, rlKey('brevo-daily-email', day), BREVO_DAILY_APP_LIMIT, 24 * 60 * 60)
  if (!reservation.allowed) throw new Error('Brevo daily application email limit reached')
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}

export async function sendOtpEmail(to: string, code: string, ttlMinutes: number) {
  await reserveDailyEmail()
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  if (!apiKey || !senderEmail) throw new Error('BREVO_API_KEY / BREVO_SENDER_EMAIL manquants')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'The Lions of ESI', email: senderEmail },
      to: [{ email: to }],
      subject: `Votre code de vérification : ${code}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="color:#7a1f2b;margin:0 0 12px">The Lions of ESI</h2>
          <p>Voici votre code pour vérifier votre adresse et choisir votre mot de passe :</p>
          <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:20px 0">${code}</p>
          <p>Il est valable ${ttlMinutes} minutes et ne peut être utilisé qu'une seule fois.</p>
          <p style="color:#666;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</p>
        </div>`,
    }),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
}

export async function sendFirstLoginOtpEmail(to: string, code: string, ttlMinutes: number) {
  await reserveDailyEmail()
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  if (!apiKey || !senderEmail) throw new Error('Configuration e-mail indisponible')
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'The Lions of ESI', email: senderEmail },
      to: [{ email: to }],
      subject: 'Code de première connexion · The Lions of ESI',
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h2 style="color:#6e0f22">The Lions of ESI</h2><p>Voici le code nécessaire pour choisir votre mot de passe personnel :</p><p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:20px 0">${code}</p><p>Ce code expire dans ${ttlMinutes} minutes et ne peut être utilisé qu’une seule fois.</p><p style="color:#666;font-size:13px">Si vous n’êtes pas à l’origine de cette connexion, ignorez cet e-mail et contactez le coach.</p></div>`,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Échec d’envoi du code (${res.status})`)
}

export async function sendAdminLoginAlert(to: string, details: { ip: string; userAgent: string }) {
  await reserveDailyEmail()
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  if (!apiKey || !senderEmail) throw new Error('Configuration e-mail indisponible')

  const occurredAt = new Date().toISOString()
  const ip = escapeHtml(details.ip)
  const userAgent = escapeHtml(details.userAgent || 'Inconnu')
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'The Lions of ESI', email: senderEmail },
      to: [{ email: to }],
      subject: 'Connexion à votre espace administrateur ESI',
      textContent: `Une connexion à votre espace administrateur The Lions of ESI a eu lieu le ${occurredAt} (UTC). Adresse IP : ${details.ip}. Navigateur : ${details.userAgent || 'Inconnu'}. Si vous n’êtes pas à l’origine de cette connexion, changez immédiatement votre mot de passe et contactez le staff.`,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#241519"><h2 style="color:#6e0f22">The Lions of ESI</h2><p>Une connexion à votre espace administrateur vient d’avoir lieu.</p><p><strong>Date (UTC) :</strong> ${escapeHtml(occurredAt)}<br><strong>Adresse IP :</strong> ${ip}<br><strong>Navigateur :</strong> ${userAgent}</p><p>Si vous n’êtes pas à l’origine de cette connexion, changez immédiatement votre mot de passe et contactez le staff.</p></div>`,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Échec d’envoi de l’alerte e-mail (${res.status})`)
}

export async function sendAccountReadyEmail(to: string, firstName: string, code: string) {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  if (!apiKey || !senderEmail) throw new Error('Configuration e-mail indisponible')
  if (!/^\d{6}$/.test(code)) throw new Error('Code d’invitation invalide')

  const recipientName = (firstName || 'membre de l’équipe').slice(0, 80)
  const safeFirstName = escapeHtml(recipientName)
  const safeCode = escapeHtml(code)
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const deployHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  const baseUrl = configuredBaseUrl || (deployHost ? 'https://' + deployHost : process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '')
  if (!baseUrl) throw new Error('URL publique de l’application manquante')
  let parsedBaseUrl: URL
  try {
    parsedBaseUrl = new URL(baseUrl)
  } catch {
    throw new Error('URL publique de l’application invalide')
  }
  const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(parsedBaseUrl.hostname)
  if (!['http:', 'https:'].includes(parsedBaseUrl.protocol) || (isLoopback && process.env.NODE_ENV === 'production')) {
    throw new Error('L’invitation nécessite une URL accessible publiquement')
  }
  await reserveDailyEmail()
  const inviteUrl = new URL('/mot-de-passe-oublie', parsedBaseUrl.origin)
  inviteUrl.searchParams.set('invitation', '1')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'The Lions of ESI', email: senderEmail },
      to: [{ email: to }],
      subject: 'Votre accès à The Lions of ESI',
      textContent: 'Bonjour ' + recipientName + ', votre accès à The Lions of ESI est prêt. Votre code d’activation est ' + code + '. Ouvrez ' + inviteUrl.toString() + ', saisissez ce code puis choisissez votre mot de passe. Le code expire après 10 minutes et ne peut être utilisé qu’une seule fois. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
      htmlContent: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#241519"><h2 style="color:#6e0f22">The Lions of ESI</h2><p>Bonjour ' + safeFirstName + ',</p><p>Votre accès à The Lions of ESI est prêt.</p><p>Code d’activation :</p><p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:20px 0;color:#6e0f22">' + safeCode + '</p><p>Ce code expire dans 10 minutes et ne peut être utilisé qu’une seule fois.</p><p><a href="' + inviteUrl.toString() + '" style="display:inline-block;background:#6e0f22;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px">Choisir mon mot de passe</a></p><p>Sur la page, saisissez le code ci-dessus. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p></div>',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error('Échec d’envoi de l’invitation (' + res.status + ')')
}
