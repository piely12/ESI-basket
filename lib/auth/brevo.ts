import 'server-only'

export async function sendOtpEmail(to: string, code: string, ttlMinutes: number) {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  if (!apiKey || !senderEmail) throw new Error('BREVO_API_KEY / BREVO_SENDER_EMAIL manquants')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'The Lions of ESI', email: senderEmail },
      to: [{ email: to }],
      subject: `Votre code de réinitialisation : ${code}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="color:#7a1f2b;margin:0 0 12px">The Lions of ESI</h2>
          <p>Voici votre code pour réinitialiser votre mot de passe :</p>
          <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:20px 0">${code}</p>
          <p>Il est valable ${ttlMinutes} minutes et ne peut être utilisé qu'une seule fois.</p>
          <p style="color:#666;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</p>
        </div>`,
    }),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
}
