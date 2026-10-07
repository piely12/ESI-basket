import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireUser'
import { AdminAccountForm, AdminPlayerStatusForm, type AccountTarget } from './forms'

const STAFF_ROLE_LABELS: Record<string, string> = {
  coach: 'Coach principal',
  coach_adjoint: 'Coach adjoint',
  statisticienne: 'Statisticienne',
  videaste: 'Vidéaste',
  admin: 'Administrateur',
}

export default async function AdminPage() {
  const { supabase } = await requireRole('admin')

  const { data: team, error: teamError } = await supabase
    .from('teams').select('id, name').eq('is_esi', true).maybeSingle()
  if (teamError || !team) throw new Error('Impossible de charger l’équipe ESI.')

  // Le service role est utilisé uniquement après vérification du rôle admin
  // afin de lire les liens user_id et les e-mails sans les exposer au navigateur.
  const admin = createAdminClient()
  const [playersResult, staffResult, usersResult] = await Promise.all([
    admin.from('players')
      .select('id, first_name, last_name, jersey_number, position, status, user_id')
      .eq('team_id', team.id).order('jersey_number', { ascending: true }),
    admin.from('staff')
      .select('id, first_name, last_name, role, user_id')
      .eq('team_id', team.id).order('created_at', { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (playersResult.error || staffResult.error || usersResult.error) {
    // Keep actionable diagnostics in the server terminal only. Never return
    // database or Auth error details to the browser page.
    console.error('[admin] Failed to load team profiles', {
      players: playersResult.error && {
        code: playersResult.error.code,
        message: playersResult.error.message,
        details: playersResult.error.details,
        hint: playersResult.error.hint,
      },
      staff: staffResult.error && {
        code: staffResult.error.code,
        message: staffResult.error.message,
        details: staffResult.error.details,
        hint: staffResult.error.hint,
      },
      authUsers: usersResult.error && {
        status: usersResult.error.status,
        message: usersResult.error.message,
      },
    })
    throw new Error('Impossible de charger les comptes et profils de l’équipe.')
  }

  const emailByUserId = new Map<string, string>()
  for (const user of usersResult.data.users ?? []) {
    if (user.email) emailByUserId.set(user.id, user.email)
  }
  const players = playersResult.data ?? []
  const staff = staffResult.data ?? []

  const unlinkedTargets: AccountTarget[] = [
    ...players.filter((player) => !player.user_id).map((player) => ({
      value: `joueur:${player.id}`,
      label: `Joueur n°${player.jersey_number ?? '—'} · ${player.first_name} ${player.last_name}`,
    })),
    // Le rôle administrateur ne peut pas être attribué depuis ce formulaire.
    ...staff.filter((member) => !member.user_id && member.role !== 'admin').map((member) => ({
      value: `staff:${member.id}`,
      label: `${STAFF_ROLE_LABELS[member.role] ?? member.role} · ${member.first_name} ${member.last_name}`,
    })),
  ]

  const available = players.filter((player) => player.status === 'actif').length
  const linkedCount = players.filter((player) => player.user_id).length
    + staff.filter((member) => member.user_id).length

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 pb-28 pt-8 sm:px-5">
      <header className="rounded-2xl bg-[var(--maroon-900)] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">The Lions of ESI</p>
        <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">Administration</h1>
        <p className="mt-3 text-sm text-white/80">Comptes, effectif et disponibilités de {team.name}.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Résumé administratif">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <strong className="font-display text-4xl text-[var(--maroon-900)]">{players.length}</strong>
          <p className="text-sm text-[var(--ink-soft)]">Joueurs à l’effectif</p>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <strong className="font-display text-4xl text-[var(--maroon-900)]">{available}</strong>
          <p className="text-sm text-[var(--ink-soft)]">Joueurs disponibles</p>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <strong className="font-display text-4xl text-[var(--maroon-900)]">{linkedCount}</strong>
          <p className="text-sm text-[var(--ink-soft)]">Comptes associés</p>
        </article>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="account-heading">
        <div className="mb-5">
          <h2 id="account-heading" className="font-display text-3xl text-[var(--maroon-900)]">Créer ou rattacher un compte</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Associe un compte Supabase à une fiche joueur ou staff existante.</p>
        </div>
        <AdminAccountForm targets={unlinkedTargets} />
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="roster-heading">
        <div className="mb-4">
          <h2 id="roster-heading" className="font-display text-3xl text-[var(--maroon-900)]">Effectif et disponibilités</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Les changements sont enregistrés immédiatement dans Supabase.</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {players.map((player) => (
            <article key={player.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--ink)]">{player.jersey_number ?? '—'} · {player.first_name} {player.last_name}</p>
                <p className="text-sm text-[var(--ink-soft)]">{player.position || 'Poste à préciser'}</p>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  {player.user_id
                    ? `Compte associé · ${emailByUserId.get(player.user_id) ?? 'e-mail indisponible'}`
                    : 'Aucun compte associé'}
                </p>
              </div>
              <AdminPlayerStatusForm playerId={player.id} playerName={`${player.first_name} ${player.last_name}`} status={player.status} />
            </article>
          ))}
          {players.length === 0 && <p className="py-5 text-sm text-[var(--ink-soft)]">Aucun joueur trouvé dans l’effectif ESI.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="staff-heading">
        <h2 id="staff-heading" className="mb-4 font-display text-3xl text-[var(--maroon-900)]">Comptes du staff</h2>
        <div className="divide-y divide-[var(--line)]">
          {staff.map((member) => (
            <article key={member.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--ink)]">{member.first_name} {member.last_name}</p>
                <p className="text-sm text-[var(--ink-soft)]">{STAFF_ROLE_LABELS[member.role] ?? member.role}</p>
              </div>
              <p className="text-sm text-[var(--ink-soft)]">
                {member.user_id ? emailByUserId.get(member.user_id) ?? 'Compte associé' : 'Aucun compte associé'}
              </p>
            </article>
          ))}
          {staff.length === 0 && <p className="py-5 text-sm text-[var(--ink-soft)]">Aucun profil staff trouvé.</p>}
        </div>
      </section>
    </main>
  )
}
