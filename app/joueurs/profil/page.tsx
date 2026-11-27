import LogoutButton from '@/components/LogoutButton'
import PlayerPushToggle from '@/components/PlayerPushToggle'
import PseudoForm from '@/components/PseudoForm'
import { requireAnyRole } from '@/lib/auth/requireUser'
import { getOwnPseudo } from '@/lib/data/player-pseudo'

export default async function Page() {
  const { supabase, user, profile } = await requireAnyRole(['joueur'])
  const pseudo = await getOwnPseudo(supabase, user.id)
  const card = 'rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4'
  return <main className="mx-auto max-w-3xl space-y-4 px-4 pt-6 sm:px-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Mon compte</p><h1 className="font-display text-3xl text-brand">{profile.first_name} {profile.last_name}</h1></div>
    <section className={card} aria-label="Pseudo"><PseudoForm current={pseudo ?? ''} /></section>
    <section className={card} aria-label="Connexion">
      <p className="text-sm font-medium">Adresse e-mail de connexion</p>
      <p className="mt-1 break-all text-sm text-[var(--ink-soft)]">{user.email}</p>
    </section>
    <section className={card} aria-labelledby="push-title">
      <h2 id="push-title" className="text-sm font-medium">Notifications sur le téléphone</h2>
      <div className="mt-2"><PlayerPushToggle /></div>
    </section>
    <section className={card} aria-labelledby="install-title">
      <h2 id="install-title" className="text-sm font-medium">Installer l’application</h2>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">Android : menu du navigateur puis « Installer l’application ». iPhone : bouton Partager puis « Sur l’écran d’accueil ». L’app s’ouvre alors directement sur ton espace.</p>
    </section>
    <div className="[&>button]:border-[var(--line)] [&>button]:text-brand"><LogoutButton /></div>
  </main>
}
