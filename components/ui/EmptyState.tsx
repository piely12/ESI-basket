import Image from 'next/image'
import Link from 'next/link'

type EmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  href?: string
  onAction?: () => void
}

export default function EmptyState({ title, description, actionLabel, href, onAction }: EmptyStateProps) {
  return <section className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-5 py-8 text-center" aria-live="polite">
    <Image src="/logos/esi.png" alt="" width={56} height={56} className="mx-auto mb-3 size-12 object-contain opacity-35 grayscale" />
    <h2 className="font-display text-2xl text-[var(--maroon-900)]">{title}</h2>
    <p className="mx-auto mt-1 max-w-md text-sm text-[var(--ink-soft)]">{description}</p>
    {actionLabel && href && <Link href={href} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--maroon-900)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">{actionLabel}</Link>}
    {actionLabel && onAction && <button type="button" onClick={onAction} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--maroon-900)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">{actionLabel}</button>}
  </section>
}
