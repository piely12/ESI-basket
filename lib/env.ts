import 'server-only'

/**
 * Lit une variable d'environnement serveur.
 * Accepte aussi le nom en minuscules (certaines variables ont été saisies
 * ainsi sur Vercel) et retire les espaces ou sauts de ligne collés par erreur.
 */
export function serverEnv(name: string): string | undefined {
  const value = process.env[name] ?? process.env[name.toLowerCase()]
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
