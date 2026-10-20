import Image from 'next/image'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { requireRole } from '@/lib/auth/requireUser'
import styles from '../coach/coach.module.css'

export default async function AssistantCoachLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole('coach_adjoint')
  return <div className={styles.shell}>
    <header className={styles.header}>
      <Link href="/adjoint" className={styles.brand} aria-label="The Lions of ESI, espace adjoint">
        <Image src="/logos/esi.png" alt="" width={48} height={48} priority className={styles.logo} />
        <span className={styles.brandCopy}><strong>The Lions of ESI</strong><small>Espace coach adjoint</small></span>
      </Link>
      <div className={styles.account}><span>{profile.first_name} {profile.last_name}</span><LogoutButton /></div>
    </header>
    <div className={styles.content}>{children}</div>
  </div>
}
