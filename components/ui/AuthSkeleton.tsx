import { Skeleton, SkeletonRegion, SkeletonText } from './Skeleton'

export default function AuthSkeleton() {
  return <SkeletonRegion className="grid min-h-[75vh] place-items-center px-4 py-10">
    <section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
      <div className="mb-6 grid justify-items-center gap-3"><Skeleton circle className="size-16" /><Skeleton className="h-8 w-48" /><Skeleton className="h-3 w-64 max-w-full" /></div>
      <div className="space-y-5"><div><Skeleton className="mb-2 h-3 w-24" /><Skeleton className="h-12 w-full rounded-lg" /></div><div><Skeleton className="mb-2 h-3 w-28" /><Skeleton className="h-12 w-full rounded-lg" /></div><Skeleton className="h-12 w-full rounded-lg" /><SkeletonText lines={1} className="mx-auto w-2/3" /></div>
    </section>
  </SkeletonRegion>
}
