import PublicNav from '@/components/PublicNav'
import { MatchCardSkeleton, PageHeaderSkeleton, Skeleton, SkeletonRegion, SkeletonText } from './Skeleton'

type Kind = 'home' | 'matches' | 'detail' | 'standings' | 'roster' | 'settings' | 'admin' | 'workspace'

export default function PageSkeleton({ kind }: { kind: Kind }) {
  if (kind === 'workspace') return <SkeletonRegion className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-5">
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><Skeleton className="h-10 w-56" /><SkeletonText className="mt-4 max-w-xl" /></div>
    <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><Skeleton className="h-8 w-48" /><div className="mt-4 space-y-4">{[0, 1, 2, 3].map((item) => <div key={item} className="flex items-center gap-3"><Skeleton circle className="size-10" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-9 w-24" /></div>)}</div></div>
  </SkeletonRegion>

  return <><PublicNav /><main className={`mx-auto max-w-5xl px-4 sm:px-5 ${kind === 'home' ? 'space-y-8 pb-28 pt-6' : 'pb-28 pt-8'}`}>
    {kind === 'home' ? <>
      <SkeletonRegion className="space-y-8">
        <section className="relative min-h-[270px] overflow-hidden rounded-xl bg-[var(--maroon-900)] p-6 sm:min-h-[320px] sm:p-8"><Skeleton className="h-4 w-44" /><Skeleton className="mt-5 h-28 w-64 max-w-full" /><div className="mt-8 flex gap-8"><Skeleton className="h-12 w-16" /><Skeleton className="h-12 w-16" /><Skeleton className="h-12 w-16" /></div></section>
        <section className="grid gap-5 md:grid-cols-2"><MatchCardSkeleton large /><MatchCardSkeleton large /></section>
        <section><Skeleton className="mb-3 h-8 w-44" /><Skeleton className="h-24 rounded-lg" /></section>
        <section><Skeleton className="mb-3 h-8 w-48" /><div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">{Array.from({ length: 8 }, (_, i) => <div key={i} className="grid justify-items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3"><Skeleton circle className="size-12" /><Skeleton className="h-3 w-12" /></div>)}</div></section>
      </SkeletonRegion>
    </> : <SkeletonRegion>
      <PageHeaderSkeleton width={kind === 'standings' ? 'w-64' : kind === 'roster' ? 'w-72' : 'w-48'} />
      {kind === 'matches' && <><div className="mb-4 flex gap-2"><Skeleton className="h-10 w-28 rounded-full" /><Skeleton className="h-10 w-28 rounded-full" /><Skeleton className="h-10 w-28 rounded-full" /></div><div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 6 }, (_, i) => <MatchCardSkeleton key={i} />)}</div></>}
      {kind === 'detail' && <><Skeleton className="mb-4 h-52 rounded-xl" /><div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /></div></>}
      {kind === 'standings' && <><Skeleton className="h-72 rounded-lg" /><Skeleton className="mt-4 h-40 rounded-lg" /></>}
      {kind === 'roster' && <><div className="mb-5 flex gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-20 rounded-full" />)}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div></>}
      {kind === 'settings' && <div className="grid gap-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-56 rounded-xl" /></div>}
    </SkeletonRegion>}
  </main></>
}
