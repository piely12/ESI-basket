import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieOptions } from '@/lib/supabase/config'
import { SITES, SHARED_PATHS } from '@/lib/sites'
import { getCurrentUserProfile, allowedSites } from '@/lib/auth/roles'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

function createCsp() {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // The UI uses React style props for a few measured values (for example
    // the password strength meter); script execution remains nonce-only.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    try {
      const endpoint = new URL(supabaseUrl)
      directives[0] += ` ${endpoint.origin}`
      directives[4] += ` ${endpoint.origin}`
      directives[6] += ` ${endpoint.origin} ${endpoint.origin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')}`
    } catch {
      // Invalid configuration is surfaced by the Supabase client itself.
    }
  }

  return { nonce, value: directives.join('; ') }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const csp = createCsp()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', csp.nonce)
  requestHeaders.set('Content-Security-Policy', csp.value)
  // Private workspaces share the public site's origin, as specified in the
  // project brief: esi-basket.ci/coach, /stats, /actus, /joueurs and /admin.
  const site = SITES.find((candidate) => pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`)) ?? null
  const isShared = SHARED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  // Rafraîchit la session Supabase pour les routes privées ou un visiteur connecté.
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
            requestHeaders.set('cookie', request.cookies.toString())
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
    res.headers.set('Content-Security-Policy', csp.value)
    if (pathname === '/login' || pathname === '/premiere-connexion') {
      res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    }
    return res
  }

  // Account state is read from the database for every authenticated request.
  // This is an early redirect only; private pages and actions repeat the check.
  if (user && supabaseClient) {
    const { data, error } = await supabaseClient.rpc('current_user_access_state')
    const account = data as { is_active?: boolean; must_change_password?: boolean } | null
    if (error || !account || account.is_active !== true) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      request.cookies.getAll().filter((cookie) => cookie.name.startsWith('sb-')).forEach(({ name }) => {
        response.cookies.set(name, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
      })
      return finalize(response)
    }
    const allowedDuringFirstLogin = pathname === '/premiere-connexion'
      || pathname === '/api/auth/first-login/complete'
      || pathname === '/api/auth/logout'
    if (account.must_change_password && !allowedDuringFirstLogin) {
      return finalize(NextResponse.redirect(new URL('/premiere-connexion', request.url)))
    }
  }

  // Espace privé : connexion obligatoire.
  if (hasAuthCookie && !user) {
    const response = site && !isShared
      ? NextResponse.redirect(new URL('/login', request.url))
      : NextResponse.next({ request: { headers: requestHeaders } })
    request.cookies.getAll().filter((cookie) => cookie.name.startsWith('sb-')).forEach(({ name }) => {
      response.cookies.set(name, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
    })
    return finalize(response)
  }

  if (site && !isShared && !user) {
    return finalize(NextResponse.redirect(new URL('/login', request.url)))
  }

  // Contrôle du rôle : un joueur ne peut pas ouvrir /coach, etc.
  // (lecture de staff/players autorisée par la RLS pour le compte connecté)
  if (site && !isShared && user && supabaseClient) {
    const profile = await getCurrentUserProfile(supabaseClient)
    const role = profile?.role ?? null
    if (!role || !allowedSites(role).includes(site)) {
      return finalize(NextResponse.redirect(new URL('/acces-refuse', request.url)))
    }
  }

  return finalize(NextResponse.next({ request: { headers: requestHeaders } }))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
