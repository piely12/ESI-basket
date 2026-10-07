import type { CSSProperties, ReactNode } from 'react'

type SkeletonProps = {
  className?: string
  style?: CSSProperties
  circle?: boolean
}

export function Skeleton({ className = '', style, circle = false }: SkeletonProps) {
  return <span aria-hidden="true" className={`skeleton-block skeleton-reveal block ${circle ? 'rounded-full' : 'rounded-xl'} ${className}`} style={style} />
}

export function SkeletonText({ lines = 2, className = '' }: { lines?: number; className?: string }) {
  return <div aria-hidden="true" className={`grid gap-2 ${className}`}>
    {Array.from({ length: lines }, (_, index) => <Skeleton key={index} className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />)}
  </div>
}

export function SkeletonRegion({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div role="status" aria-busy="true" className={className}>
    <span className="sr-only">Chargement…</span>
    {children}
  </div>
}

export function PageHeaderSkeleton({ width = 'w-48' }: { width?: string }) {
  return <header className="mb-5 space-y-3"><Skeleton className={`h-11 max-w-full ${width}`} /><Skeleton className="h-3 w-40" /></header>
}

export function MatchCardSkeleton({ large = false }: { large?: boolean }) {
  return <article aria-hidden="true" className={`rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 ${large ? 'min-h-48' : 'min-h-36'}`}>
    <div className="flex items-center justify-between gap-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-6 w-20 rounded-full" /></div>
    <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
      <div className="grid justify-items-center gap-2"><Skeleton circle className="size-10" /><Skeleton className="h-3 w-16" /></div>
      <Skeleton className="h-6 w-8" />
      <div className="grid justify-items-center gap-2"><Skeleton circle className="size-10" /><Skeleton className="h-3 w-16" /></div>
    </div>
    <Skeleton className="mt-5 h-3 w-1/2" />
  </article>
}
