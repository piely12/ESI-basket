import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, type AppRole } from '@/lib/auth/roles'
import LogoutButton from './LogoutButton'

const ROLE_LABEL: Record<AppRole, string> = {
  coach: 'Coach',
  coach_adjoint: 'Coach adjoint',
  statisticienne: 'Statisticienne',
  videaste: 'Vidéaste',
  admin: 'Administrateur',
  joueur: 'Joueur',
}

export default async function SpaceHeader({ title }: { title: string }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  let who = ''
  if (user) {
    const profile = await getCurrentUserProfile(supabase)
    const name = profile ? `${profile.first_name} ${profile.last_name}` : (user.email ?? '')
    who = profile ? `${name} · ${ROLE_LABEL[profile.role]}` : name
  }

  return (
    <header className="flex items-center justify-between gap-4 bg-[#7a1f2b] px-4 py-3 text-white">
      <div>
        <p className="font-bold">The Lions of ESI</p>
        <p className="text-xs opacity-80">{title}</p>
      </div>
      <div className="flex items-center gap-3">
        {who && <span className="hidden text-sm sm:inline">{who}</span>}
        <LogoutButton />
      </div>
    </header>
  )
}
