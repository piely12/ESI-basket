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
    case 'Classement':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><path d="M8 21h8M12 17v4M7 4H4v3a5 5 0 0 0 5 5M17 4h3v3a5 5 0 0 1-5 5" /><path d="M7 3h10v7a5 5 0 0 1-10 0V3Z" /></svg>
    case 'Équipe':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    case 'Actus':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h4v4H7zM14 8h3M14 12h3M7 16h10" /></svg>
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 .1 1.7Z" transform="translate(-1 -2)" /></svg>
  }
}

export default function PublicNav() {
  const pathname = usePathname()
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--maroon-900)] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="The Lions of ESI — accueil">
            <Image src="/logos/esi.png" alt="" width={40} height={40} priority className="h-10 w-10 shrink-0 object-contain" />
            <span className="min-w-0 leading-none">
              <span className="block truncate font-display text-xl tracking-wide text-[var(--gold-500)] sm:text-2xl">THE LIONS OF ESI</span>
              <span className="mt-1 block truncate text-[9px] uppercase tracking-[0.18em] opacity-80">Inter-Écoles INP-HB</span>
            </span>
          </Link>
          <Link href="/login" className="shrink-0 rounded border border-[var(--gold-500)]/70 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--gold-500)] transition hover:bg-[var(--gold-500)] hover:text-[var(--maroon-900)] sm:text-xs">
            Espaces
          </Link>
        </div>
      </header>
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(65px+env(safe-area-inset-bottom))] grid-cols-6 border-t border-[var(--line)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(35,23,18,0.08)]">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} className={`flex flex-col items-center justify-center gap-0.5 px-0.5 text-center text-xs leading-tight transition-colors [&_svg]:h-6 [&_svg]:w-6 ${pathname === link.href ? 'text-[var(--maroon-700)]' : 'text-[#806c66]'}`}>
            <NavIcon name={link.label} />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
