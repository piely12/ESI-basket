'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/joueurs', label: 'Convocations', icon: 'M3 5h18v16H3zM16 3v4M8 3v4M3 10h18M8 15l3 3 5-6' },
  { href: '/joueurs/notifications', label: 'Notifications', icon: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4' },
  { href: '/joueurs/stats', label: 'Stats', icon: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3' },
  { href: '/joueurs/profil', label: 'Profil', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
]

export default function PlayerNav({ unread }: { unread: number }) {
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/joueurs' ? pathname === '/joueurs' : pathname.startsWith(href))
  return (
    <nav aria-label="Navigation joueur" className="public-bottom-nav" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? 'page' : undefined}
          className="public-bottom-link focus-visible:outline-2 focus-visible:outline-ring">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={link.icon} /></svg>
          <span className="relative">
            {link.label}
            {link.href === '/joueurs/notifications' && unread > 0 && (
              <span aria-label={`${unread} non lue${unread === 1 ? '' : 's'}`} className="absolute -right-3 -top-3 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--gold-500)] px-1 text-[10px] font-bold text-[var(--maroon-panel)]">{unread > 99 ? '99+' : unread}</span>
            )}
          </span>
        </Link>
      ))}
    </nav>
  )
}
