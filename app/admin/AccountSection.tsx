import Link from 'next/link'
import { AdminAccountForm, AssistantCoachProfileForm, HeadCoachProfileForm, ProfileAccountRow, type AccountTarget } from './forms'
import type { AccountProfile } from './data'

export default function AccountSection({
  title,
  description,
  profiles,
  targets,
  needsCoachProfile = false,
  canCreateAssistantProfile = false,
}: {
  title: string
  description: string
  profiles: AccountProfile[]
  targets: AccountProfile[]
  needsCoachProfile?: boolean
  canCreateAssistantProfile?: boolean
}) {
  const options: AccountTarget[] = targets.filter((profile) => !profile.userId).map((profile) => ({
    value: profile.ref,
    label: profile.label,
  }))
  return <main className="mx-auto max-w-5xl space-y-6 px-4 pb-28 pt-8 sm:px-6">
    <Link href="/admin" className="inline-flex min-h-10 items-center font-semibold text-brand">Administration</Link>
    <header className="rounded-2xl bg-maroon-panel p-6 text-on-brand sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">Espace administrateur</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{title}</h1>
      {description && <p className="mt-3 text-sm text-on-brand/80">{description}</p>}
    </header>
    {needsCoachProfile && <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="coach-profile-heading">
      <h2 id="coach-profile-heading" className="mb-2 font-display text-2xl text-brand">Compte du coach principal</h2>
      <p className="mb-4 text-sm text-[var(--ink-soft)]">Crée sa fiche nominative ; tu pourras ensuite lui envoyer une invitation avec un code pour définir son mot de passe.</p>
      <HeadCoachProfileForm />
    </section>}
    {canCreateAssistantProfile && <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="assistant-profile-heading">
      <h2 id="assistant-profile-heading" className="mb-2 font-display text-2xl text-brand">Coach adjoint</h2>
      <p className="mb-4 text-sm text-[var(--ink-soft)]">Crée une fiche nominative, puis associe un compte depuis la section ci-dessous. Cette fiche donne uniquement accès au parcours des compositions.</p>
      <AssistantCoachProfileForm />
    </section>}
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="invite-heading">
      <h2 id="invite-heading" className="mb-4 font-display text-2xl text-brand">Rattacher ou inviter un compte</h2>
      {options.length ? <AdminAccountForm targets={options} /> : <p className="text-sm text-[var(--ink-soft)]">Aucun profil disponible à rattacher.</p>}
    </section>
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="profiles-heading">
      <h2 id="profiles-heading" className="mb-2 font-display text-2xl text-brand">Profils et accès</h2>
      <p className="mb-3 text-sm text-[var(--ink-soft)]">Un profil sans compte est indiqué comme « non rattaché ».</p>
      {profiles.map((profile) => <ProfileAccountRow key={profile.ref} profile={profile} />)}
      {profiles.length === 0 && <p className="py-4 text-sm text-[var(--ink-soft)]">Aucun profil trouvé.</p>}
    </section>
  </main>
}
