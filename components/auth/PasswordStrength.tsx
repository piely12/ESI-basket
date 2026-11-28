'use client'

import { PASSWORD_MIN } from '@/lib/validation'

/** Rules the server enforces (validateNewPassword), shown as a checklist. */
export function passwordRules(password: string, email?: string) {
  const compact = password.toLowerCase().replace(/[^a-z0-9]/g, '')
  const local = (email ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  return [
    { label: `${PASSWORD_MIN} caractères minimum`, ok: [...password].length >= PASSWORD_MIN },
    { label: 'Lettres et chiffres', ok: /\p{L}/u.test(password) && /\d/.test(password) },
    { label: 'Sans ton adresse e-mail', ok: password.length > 0 && !(local.length >= 4 && compact.includes(local)) },
  ]
}

/** 0 à 4 : longueur, majuscules et minuscules, chiffres, symboles. */
function score(password: string) {
  if (!password) return 0
  let points = 0
  if (password.length >= PASSWORD_MIN) points += 1
  if (password.length >= 14) points += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) points += 1
  return password.length < PASSWORD_MIN ? Math.min(points, 1) : Math.max(points, 1)
}

const LEVELS = ['Trop court', 'Faible', 'Correct', 'Bon', 'Excellent']

export default function PasswordStrength({ password, email, id }: { password: string; email?: string; id: string }) {
  const level = score(password)
  const rules = passwordRules(password, email)
  return <div id={id} className="auth-strength">
    <div className="flex items-center gap-3">
      <div className="auth-strength-bar" data-level={level} role="meter" aria-label="Robustesse du mot de passe" aria-valuemin={0} aria-valuemax={4} aria-valuenow={level} aria-valuetext={password ? LEVELS[level] : 'Vide'}>
        {[1, 2, 3, 4].map((step) => <span key={step} data-on={level >= step || undefined} />)}
      </div>
      <span className="auth-strength-label" aria-hidden="true">{password ? LEVELS[level] : ''}</span>
    </div>
    <ul className="auth-rules" aria-label="Règles du mot de passe">
      {rules.map((rule) => <li key={rule.label} data-ok={rule.ok || undefined}>
        <span aria-hidden="true">{rule.ok ? '✓' : '•'}</span>
        {rule.label}<span className="sr-only">{rule.ok ? ' : respecté' : ' : à respecter'}</span>
      </li>)}
    </ul>
  </div>
}
