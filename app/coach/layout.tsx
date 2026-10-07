import Image from 'next/image'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { requireAnyRole } from '@/lib/auth/requireUser'
import styles from './coach.module.css'

const navigation = [
  { href: '/coach', label: 'Accueil' },
  { href: '/coach/equipe', label: 'Effectif' },
  { href: '/coach/matchs/nouveau', label: 'Préparer un match' },
]

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAnyRole(['coach', 'coach_adjoint', 'admin'])
  const person = `${profile.first_name} ${profile.last_name}`

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/coach" className={styles.brand} aria-label="The Lions of ESI, accueil coach">
          <Image src="/logos/esi.png" alt="" width={48} height={48} priority className={styles.logo} />
          <span className={styles.brandCopy}>
            <strong>The Lions of ESI</strong>
            <small>Espace Coach</small>
          </span>
        </Link>
        <nav className={styles.desktopNav} aria-label="Navigation coach">
          {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className={styles.account}>
          <span>{person}</span>
          <LogoutButton />
        </div>
      </header>
      <div className={styles.content}>{children}</div>
      <nav className={styles.mobileNav} aria-label="Navigation coach">
        {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
      </nav>
    </div>
  )
}
