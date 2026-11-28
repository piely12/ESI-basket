import Link from 'next/link'
import { getAdminAccountData } from '../data'
import BulkInviteForm from './BulkInviteForm'

export const maxDuration = 60

export default async function AdminInvitationsPage() {
  const { players, staff } = await getAdminAccountData()
  const profiles = [...players, ...staff.filter((profile) => profile.role !== 'admin')].map((profile) => ({
    ref: profile.ref,
    name: profile.name,
    label: profile.label,
    role: profile.role,
    status: profile.status,
    email: profile.email,
  }))
  return <main className="mx-auto max-w-5xl space-y-6 px-4 pb-28 pt-8 sm:px-6">
    <Link href="/admin" className="inline-flex min-h-10 items-center font-semibold text-brand underline underline-offset-4">Administration</Link>
    <header className="rounded-2xl bg-maroon-panel p-6 text-on-brand sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">Espace administrateur</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Inviter l’effectif</h1>
      <p className="mt-3 max-w-2xl text-sm text-on-brand/80">Colle la liste des adresses : chaque e-mail est associé à sa fiche. Vérifie, puis envoie. Chacun reçoit un code pour choisir son mot de passe.</p>
    </header>
    <BulkInviteForm profiles={profiles} />
  </main>
}
