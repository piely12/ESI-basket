import Link from 'next/link'
import { getAdminAccountData } from './data'

const cards = [
  { href: '/admin/staff', title: 'Staff', description: 'Gérer les comptes du coach principal et de la statisticienne.' },
  { href: '/admin/joueurs', title: 'Joueurs', description: 'Rattacher chaque compte au bon profil sportif.' },
  { href: '/admin/journal', title: 'Journal', description: 'Consulter les rattachements et les événements de sécurité.' },
]

export default async function AdminPage() {
  const { team, staff, players, mailUsage } = await getAdminAccountData()
  const pending = [...staff, ...players].filter((profile) => profile.status === 'invité').length
  const unlinked = [...staff, ...players].filter((profile) => profile.status === 'non rattaché').length
  return <main className="mx-auto max-w-5xl space-y-7 px-4 pb-28 pt-8 sm:px-6">
    <header className="rounded-2xl bg-[var(--maroon-900)] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">The Lions of ESI</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Administration</h1>
      <p className="mt-3 text-sm text-white/80">Comptes et accès de l’équipe {team.name}.</p>
    </header>
    <p className="text-sm text-[var(--ink-soft)]">{pending} invitation(s) en attente · {unlinked} profil(s) sans compte</p>
    {mailUsage.sent >= mailUsage.warningAt && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      Le volume d’e-mails approche la limite quotidienne de l’application ({mailUsage.sent}/{mailUsage.limit}). Les nouveaux envois seront bloqués à cette limite.
    </p>}
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Espaces administratifs">
      {cards.map((card) => <Link key={card.href} href={card.href} className="group min-h-48 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--gold-deep)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold-deep)]">
        <h2 className="font-display text-3xl text-[var(--maroon-900)]">{card.title}</h2>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">{card.description}</p>
        <span className="mt-6 inline-block font-semibold text-[var(--maroon-900)]">Ouvrir <span aria-hidden="true">→</span></span>
      </Link>)}
    </section>
  </main>
}
