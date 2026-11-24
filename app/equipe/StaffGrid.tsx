'use client'

import { useEffect, useRef, useState } from 'react'

export type StaffMember = { name: string; role: string; photo: string; photoLarge: string }

export default function StaffGrid({ staff }: { staff: StaffMember[] }) {
  const [index, setIndex] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const current = index === null ? null : staff[index]

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (index !== null && !el.open) el.showModal()
    if (index === null && el.open) el.close()
  }, [index])

  const close = () => { setIndex(null); opener.current?.focus() }
  const move = (step: number) => setIndex((value) => value === null ? value : (value + step + staff.length) % staff.length)

  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {staff.map((person, i) => <li key={person.role}>
          <button type="button" onClick={(event) => { opener.current = event.currentTarget; setIndex(i) }} aria-label={`Voir la photo de ${person.name} en grand`} className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)] sm:p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- photo déjà recadrée et compressée (400×400 WebP) */}
            <img src={person.photo} alt="" width={400} height={400} loading="lazy" decoding="async" className="size-20 shrink-0 rounded-full border-2 border-gold-deep/60 object-cover sm:size-24" />
            <span className="min-w-0">
              <span className="block font-semibold uppercase leading-snug text-foreground">{person.name}</span>
              <span className="mt-1 block text-sm font-bold uppercase tracking-[0.12em] text-gold-deep">{person.role}</span>
            </span>
          </button>
        </li>)}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current ? `Photo de ${current.name}` : 'Photo du staff'}
        onClose={() => setIndex(null)}
        onClick={(event) => { if (event.target === dialog.current) close() }}
        onKeyDown={(event) => { if (event.key === 'ArrowRight') move(1); if (event.key === 'ArrowLeft') move(-1) }}
        className="m-auto max-h-[92dvh] w-[min(94vw,560px)] overflow-hidden rounded-2xl border border-[var(--gold-500)]/40 bg-[var(--maroon-900,#2a0a10)] p-0 text-on-brand shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        {current && <figure className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- photo agrandie, WebP déjà optimisé */}
          <img src={current.photoLarge} alt={`Photo de ${current.name}, ${current.role.toLowerCase()}`} decoding="async" className="block max-h-[78dvh] w-full bg-black object-contain" />
          <figcaption className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0"><span className="block truncate font-display text-2xl uppercase leading-none">{current.name}</span><span className="mt-1 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-500)]">{current.role}</span></span>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={() => move(-1)} aria-label="Personne précédente" className="size-11 rounded-full border border-white/25 text-xl hover:bg-white/10">‹</button>
              <button type="button" onClick={() => move(1)} aria-label="Personne suivante" className="size-11 rounded-full border border-white/25 text-xl hover:bg-white/10">›</button>
            </span>
          </figcaption>
          <button type="button" onClick={close} aria-label="Fermer" className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-black/60 text-2xl leading-none text-white hover:bg-black/80">×</button>
        </figure>}
      </dialog>
    </>
  )
}
