import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireUser'

const ACTIONS: Record<string, string> = {
  admin_account_linked: 'Compte rattaché',
  admin_created_account: 'Invitation créée',
  admin_account_binding_cancelled: 'Rattachement annulé',
  admin_account_deleted_for_cleanup: 'Compte retiré lors du nettoyage ESI',
  admin_invitation_resent: 'Invitation renvoyée',
  admin_invitation_cancelled: 'Invitation annulée',
  admin_account_suspended: 'Compte suspendu',
  admin_account_reactivated: 'Compte réactivé',
  admin_invitation_delivery_failed: 'Échec de livraison de l’invitation',
  admin_account_notification_failed: 'Échec de livraison de l’invitation',
  first_login_otp_delivery_failed: 'Échec d’envoi du code de première connexion',
  admin_invitation_delivery_succeeded: 'Invitation livrée',
  admin_login_success: 'Connexion administrateur réussie',
  admin_login_failed: 'Échec de connexion administrateur',
  admin_login_repeated_failures: 'Échecs de connexion répétés',
  admin_login_blocked: 'Connexion temporairement bloquée',
  admin_login_alert_failed: 'Échec d’envoi de l’alerte de connexion',
  admin_login_alert_sent: 'Alerte de connexion envoyée',
  otp_requested: 'Code de vérification demandé',
  otp_delivery_failed: 'Échec de livraison du code',
  otp_verification_failed: 'Échec de vérification du code',
  otp_verification_succeeded: 'Code vérifié',
  password_reset: 'Mot de passe réinitialisé',
  first_login_password_changed: 'Mot de passe initial choisi',
  login_failed: 'Échec de connexion',
  login_success: 'Connexion réussie',
}

export default async function AdminJournalPage() {
  await requireRole('admin')
  const admin = createAdminClient()
  const [{ data: events, error }, { data: authUsers }] = await Promise.all([
    admin.from('audit_logs').select('id, actor_user_id, action, created_at')
      .order('created_at', { ascending: false }).limit(100),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  if (error) throw new Error('Impossible de charger le journal administratif.')
  const emailByUserId = new Map((authUsers.users ?? []).map((user) => [user.id, user.email ?? null]))
  return <main className="mx-auto max-w-5xl space-y-6 px-4 pb-28 pt-8 sm:px-6">
    <Link href="/admin" className="inline-flex min-h-10 items-center font-semibold text-[var(--maroon-900)]">← Administration</Link>
    <header className="rounded-2xl bg-[var(--maroon-900)] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">Espace administrateur</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Journal</h1>
      <p className="mt-3 text-sm text-white/80">100 événements récents, en lecture seule.</p>
    </header>
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 sm:px-6" aria-label="Événements récents">
      {(events ?? []).map((event) => <article key={event.id} className="grid gap-1 border-b border-[var(--line)] py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div><p className="font-semibold text-[var(--ink)]">{ACTIONS[event.action] ?? event.action.replaceAll('_', ' ')}</p>
          <p className="text-sm text-[var(--ink-soft)]">{event.actor_user_id ? emailByUserId.get(event.actor_user_id) ?? 'Compte supprimé ou inconnu' : 'Compte non identifié'}</p></div>
        <time className="text-sm text-[var(--ink-soft)]" dateTime={event.created_at}>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Abidjan' }).format(new Date(event.created_at))}</time>
      </article>)}
      {!events?.length && <p className="py-6 text-sm text-[var(--ink-soft)]">Aucun événement enregistré.</p>}
    </section>
  </main>
}
