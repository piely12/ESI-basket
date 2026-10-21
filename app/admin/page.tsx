import Link from 'next/link'
import { getAdminAccountData } from './data'

const cards = [
  { href: '/admin/staff', title: 'Staff', description: 'Gérer les comptes du coach principal, du coach adjoint et de la statisticienne.' },
  { href: '/admin/joueurs', title: 'Joueurs', description: 'Rattacher chaque compte au bon profil sportif.' },
  { href: '/admin/messages', title: 'Messages', description: 'Lire les messages anonymes et suivre leur traitement.' },
  { href: '/admin/journal', title: 'Journal', description: 'Consulter les rattachements et les événements de sécurité.' },
]

export default async function AdminPage() {
  const { team, staff, players, mailUsage } = await getAdminAccountData()
  const pending = [...staff, ...players].filter((profile) => profile.status === 'invité').length
  const unlinked = [...staff, ...players].filter((profile) => profile.status === 'non rattaché').length
  return <main className="mx-auto max-w-5xl space-y-7 px-4 pb-28 pt-8 sm:px-6">
    <header className="rounded-2xl bg-maroon-panel p-6 text-on-brand sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">The Lions of ESI</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Administration</h1>
      <p className="mt-3 text-sm text-on-brand/80">Comptes et accès de l’équipe {team.name}.</p>
    </header>
    <p className="text-sm text-[var(--ink-soft)]">{pending} invitation(s) en attente · {unlinked} profil(s) sans compte</p>
    {mailUsage.sent >= mailUsage.warningAt && <p role="status" className="rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning">
      Le volume d’e-mails approche la limite quotidienne de l’application ({mailUsage.sent}/{mailUsage.limit}). Les nouveaux envois seront bloqués à cette limite.
    </p>}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Espaces administratifs">
      {cards.map((card) => <Link key={card.href} href={card.href} className="group min-h-48 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--gold-deep)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold-deep)]">
        <h2 className="font-display text-3xl text-brand">{card.title}</h2>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">{card.description}</p>
        <span className="mt-6 inline-block font-semibold text-brand">Ouvrir</span>
      </Link>)}
    </section>
  </main>
}
