// Options de cookie partagées par le client navigateur, le serveur et le proxy.
// En production : NEXT_PUBLIC_COOKIE_DOMAIN=.esi-basket.ci  -> la session est
// partagée entre esi-basket.ci, coach.esi-basket.ci, stats.esi-basket.ci, etc.
// En local : laisser vide (chaque sous-domaine garde sa propre session).
const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined

export const cookieOptions = {
  domain,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}
