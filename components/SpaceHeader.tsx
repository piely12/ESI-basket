import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, type AppRole } from '@/lib/auth/roles'
import LogoutButton from './LogoutButton'

const ROLE_LABEL: Record<AppRole, string> = {
  coach: 'Coach',
  coach_adjoint: 'Coach adjoint',
  statisticienne: 'Statisticienne',
  admin: 'Administrateur',
  joueur: 'Joueur',
}

export default async function SpaceHeader({ title }: { title: string }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  let who = ''
  let isPlayer = false
  let unreadNotifications = 0
  if (user) {
    const profile = await getCurrentUserProfile(supabase)
    isPlayer = profile?.role === 'joueur'
    const name = profile ? `${profile.first_name} ${profile.last_name}` : (user.email ?? '')
    who = profile ? `${name} · ${ROLE_LABEL[profile.role]}` : name
    if (isPlayer) {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).is('read_at', null)
      unreadNotifications = count ?? 0
    }
  }

  return (
    <header className="flex items-center justify-between gap-4 bg-primary px-4 py-3 text-primary-foreground">
      <div>
        <p className="font-bold">The Lions of ESI</p>
        <p className="text-xs text-primary-foreground/85">{title}</p>
      </div>
      <div className="flex items-center gap-3">
        {who && <span className="hidden text-sm sm:inline">{who}</span>}
        {isPlayer && <Link href="/joueurs#notifications-title" aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} non lue${unreadNotifications === 1 ? '' : 's'}` : ''}`} className="relative grid h-10 w-10 place-items-center rounded-lg text-on-brand hover:bg-on-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--gold-500)] px-1 text-[10px] font-bold text-[var(--maroon-panel)]">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
        </Link>}
        <LogoutButton />
      </div>
    </header>
  )
}
