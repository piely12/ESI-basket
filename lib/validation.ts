// Validation partagée client + serveur. Le serveur reste TOUJOURS l'autorité :
// la validation côté navigateur n'est là que pour l'ergonomie.
export const EMAIL_MAX = 254
// 72 octets : limite de bcrypt, utilisé par Supabase Auth pour les mots de passe.
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= EMAIL_MAX && EMAIL_RE.test(email)
}

const COMMON_PASSWORDS = new Set([
  '1234567890', 'password1', 'password123', 'qwerty12345', 'welcome123',
  'admin12345', 'iloveyou123', 'azerty1234', 'football123', 'basketball1',
  'password1!', 'password@1', 'azerty123!', 'azerty@123', 'welcome1!', 'basketball1!', 'football1!', 'lions2026!',
])

// Règles affichées en direct pendant la saisie et vérifiées par le serveur.
export const PASSWORD_RULES = [
  { key: 'length', label: `${PASSWORD_MIN} caractères minimum`, test: (value: string) => [...value].length >= PASSWORD_MIN },
  { key: 'upper', label: 'Une majuscule', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'Une minuscule', test: (value: string) => /[a-z]/.test(value) },
  { key: 'digit', label: 'Un chiffre', test: (value: string) => /\d/.test(value) },
  { key: 'symbol', label: 'Un caractère spécial (! ? # @ …)', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const

// Règles d'un nouveau mot de passe (création / réinitialisation).
export function validateNewPassword(password: string, email?: string, personName?: string): string | null {
  if ([...password].length < PASSWORD_MIN) return `Au moins ${PASSWORD_MIN} caractères.`
  if ([...password].length > PASSWORD_MAX || new TextEncoder().encode(password).length > PASSWORD_MAX) return `Au plus ${PASSWORD_MAX} caractères.`
  if (!/[A-Z]/.test(password)) return 'Ajoutez au moins une majuscule.'
  if (!/[a-z]/.test(password)) return 'Ajoutez au moins une minuscule.'
  if (!/\d/.test(password)) return 'Ajoutez au moins un chiffre.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Ajoutez au moins un caractère spécial (par exemple ! ? # @).'
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'Choisissez un mot de passe moins courant.'
  if (email) {
    const normalizedPassword = password.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalizedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '')
    const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    if ((local.length >= 4 && normalizedPassword.includes(local)) || normalizedPassword.includes(normalizedEmail)) {
      return "Le mot de passe ne doit pas contenir votre adresse e-mail."
    }
  }
  if (personName) {
    const normalizedPassword = password.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const part of personName.toLowerCase().split(/\s+/).map((value) => value.replace(/[^a-z0-9]/g, '')).filter((value) => value.length >= 3)) {
      if (normalizedPassword.includes(part)) return 'Le mot de passe ne doit pas contenir votre nom.'
    }
  }
  return null
}

// Pseudo du joueur : nom affiché dans l'app (la connexion reste l'e-mail).
export const PSEUDO_MIN = 3
export const PSEUDO_MAX = 20
const PSEUDO_RE = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u
const RESERVED_PSEUDOS = new Set(['admin', 'administrateur', 'coach', 'staff', 'esi', 'lions', 'support', 'moderateur', 'statisticienne', 'joueur', 'equipe'])

export function normalizePseudo(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFC').trim() : ''
}

/** Clé de comparaison : un pseudo ne peut exister qu'une fois, majuscules ou non. */
export function pseudoKey(value: string): string {
  return normalizePseudo(value).toLowerCase()
}

export function validatePseudo(value: string): string | null {
  const pseudo = normalizePseudo(value)
  const length = [...pseudo].length
  if (length < PSEUDO_MIN) return `Au moins ${PSEUDO_MIN} caractères.`
  if (length > PSEUDO_MAX) return `Au plus ${PSEUDO_MAX} caractères.`
  if (/\s/.test(pseudo)) return 'Pas d’espace : utilise un point, un tiret ou un tiret bas.'
  if (!PSEUDO_RE.test(pseudo)) return 'Lettres, chiffres, point, tiret et tiret bas uniquement, en commençant par une lettre ou un chiffre.'
  if (/^\d+$/.test(pseudo)) return 'Ajoute au moins une lettre.'
  const plain = pseudoKey(pseudo).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (RESERVED_PSEUDOS.has(plain)) return 'Ce pseudo est réservé. Choisis-en un autre.'
  return null
}
