import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieOptions } from '@/lib/supabase/config'
import { SITES, SHARED_PATHS, getSiteFromHost } from '@/lib/sites'
import { getCurrentUserProfile, allowedSites } from '@/lib/auth/roles'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')
  const hostSite = getSiteFromHost(host)
  const hostname = host?.split(':')[0].toLowerCase() ?? ''
  const isLocalHost = hostname === 'localhost' || hostname.endsWith('.localhost')
  // Local development can use path routing (localhost/coach) to keep the
  // host-only Supabase auth cookie on one origin instead of crossing subdomains.
  const pathSite = isLocalHost
    ? SITES.find((candidate) => pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`)) ?? null
    : null
  const site = pathSite ?? hostSite
  const usesLocalPathRouting = isLocalHost && pathSite !== null
  const isShared = SHARED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  // Le site public n'expose jamais les dossiers internes des sous-domaines.
  if (!site && SITES.some((s) => pathname === `/${s}` || pathname.startsWith(`/${s}/`))) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Rafraîchit la session Supabase (sous-domaines privés, ou visiteur déjà connecté).
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  let user = null
  let supabaseClient: ReturnType<typeof createServerClient> | null = null
  const cookiesToApply: CookieToSet[] = []

  if (site || hasAuthCookie) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions,
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(cookies) {
            cookies.forEach(({ name, value }) => request.cookies.set(name, value))
            cookiesToApply.push(...(cookies as CookieToSet[]))
          },
        },
      }
    )
    supabaseClient = supabase
    user = (await supabase.auth.getUser()).data.user
  }

  const finalize = (res: NextResponse) => {
    cookiesToApply.forEach(({ name, value, options }) => res.cookies.set(name, value, { ...options, httpOnly: true }))
    return res
  }

  // Sous-domaine privé : connexion obligatoire (hors pages partagées).
  if (site && !isShared && !user) {
    return finalize(NextResponse.redirect(new URL('/login', request.url)))
  }

  // Contrôle du rôle : un joueur ne peut pas ouvrir coach.*, etc.
  // (lecture de staff/players autorisée par la RLS pour le compte connecté)
  if (site && !isShared && user && supabaseClient) {
    const profile = await getCurrentUserProfile(supabaseClient)
    const role = profile?.role ?? null
    if (!role || !allowedSites(role).includes(site)) {
      return finalize(NextResponse.redirect(new URL('/acces-refuse', request.url)))
    }
  }

  // Sous-domaine : on réécrit vers le dossier interne (coach.x/planning -> /coach/planning).
  if (site && !isShared) {
    if (usesLocalPathRouting) return finalize(NextResponse.next({ request }))
    const url = request.nextUrl.clone()
    url.pathname = `/${site}${pathname === '/' ? '' : pathname}`
    return finalize(NextResponse.rewrite(url, { request }))
  }

  return finalize(NextResponse.next({ request }))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
