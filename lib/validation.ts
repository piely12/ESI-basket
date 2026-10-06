// Validation partagée client + serveur. Le serveur reste TOUJOURS l'autorité :
// la validation côté navigateur n'est là que pour l'ergonomie.
export const EMAIL_MAX = 254
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= EMAIL_MAX && EMAIL_RE.test(email)
}

// Règles d'un nouveau mot de passe (création / réinitialisation).
export function validateNewPassword(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN) return `Au moins ${PASSWORD_MIN} caractères.`
  if (password.length > PASSWORD_MAX) return `Au plus ${PASSWORD_MAX} caractères.`
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Le mot de passe doit contenir au moins une lettre et un chiffre.'
  if (email) {
    const local = email.split('@')[0]
    if (local.length >= 4 && password.toLowerCase().includes(local.toLowerCase())) {
      return "Le mot de passe ne doit pas contenir votre adresse e-mail."
    }
  }
  return null
}
