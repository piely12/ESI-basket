'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/matchs', label: 'Matchs' },
  { href: '/classement', label: 'Classement' },
  { href: '/equipe', label: 'Équipe' },
  { href: '/actualites', label: 'Actus' },
  { href: '/reglages', label: 'Réglages' },
]

function NavIcon({ name }: { name: string }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'Accueil':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></svg>
    case 'Matchs':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></svg>
    case 'Actus':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><path d="M5 4.5h13a2 2 0 0 1 2 2V20H7a3 3 0 0 1-3-3V6.5a2 2 0 0 1 1-2Z" /><path d="M7 16.5h13M8 8h8M8 12h8M4 17a3 3 0 0 0 3 3" /></svg>
    case 'Classement':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><path d="M8 21h8M12 17v4M7 4H4v3a5 5 0 0 0 5 5M17 4h3v3a5 5 0 0 1-5 5" /><path d="M7 3h10v7a5 5 0 0 1-10 0V3Z" /></svg>
    case 'Équipe':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3" /><circle cx="4" cy="16" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="20" cy="14" r="2" /></svg>
  }
}

export default function PublicNav() {
  const pathname = usePathname()
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/equipe') return pathname.startsWith('/equipe') || pathname.startsWith('/equipes/')
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  return (
    <>
      <header className="public-header">
        <div className="public-header-inner">
          <Link href="/" className="public-header-team" aria-label="The Lions of ESI — accueil">
            <Image src="/logos/esi.png" alt="" width={50} height={48} priority />
            <span className="truncate">THE LIONS OF ESI</span>
          </Link>
          <div className="public-header-league">
            <Image
              src="/logos/inter-ecoles.png"
              alt=""
              width={55}
              height={120}
              priority
            />
            <span><small>INTER-ÉCOLES</small><strong>BASKETBALL</strong></span>
          </div>
        </div>
      </header>
      <nav aria-label="Navigation principale" className="public-bottom-nav">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? 'page' : undefined} className="public-bottom-link focus-visible:outline-2 focus-visible:outline-ring">
            <NavIcon name={link.label} />
            <span className="relative">{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
