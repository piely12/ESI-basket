import Image from 'next/image'
import type { Team } from '@/lib/data/public'

const logoFiles: Record<string, string> = {
  esi: '/logos/esi.png', esmg: '/logos/esmg.png', esa: '/logos/esa.png',
  epge: '/logos/epge.png', escae: '/logos/escae.png', escpe: '/logos/escpe.png',
  ep: '/logos/ep.png', estp: '/logos/estp.png',
}

export function teamLogoSrc(team: Team) {
  if (team.logo_url) return team.logo_url
  const name = team.name.toLowerCase().replace(/[^a-z]/g, '')
  const key = Object.keys(logoFiles).find((candidate) => name.includes(candidate))
  return logoFiles[key ?? 'esi']
}

export default function TeamLogo({ team, size = 48, className = '' }: { team: Team; size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={className ? undefined : { width: size, height: size }}
    >
      <Image
        src={teamLogoSrc(team)}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="h-full w-full object-contain"
      />
    </span>
  )
}
