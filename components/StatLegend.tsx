'use client'

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/*
 * Bouton « Légende ⓘ » : ouvre un panneau qui monte du bas de l'écran avec
 * toutes les abréviations. On le referme en le glissant vers le bas, en
 * touchant la barre du haut, l'arrière-plan, ou avec Échap ; on revient
 * exactement là où on était sur la page.
 */

const CLOSE_DISTANCE = 90
const CLOSE_DURATION = 220

export default function StatLegend({ title, items, className = '', children }: {
  title: string
  items: readonly (readonly [string, string])[]
  className?: string
  /** Contenu affiché sous les abréviations (par exemple les règles du championnat). */
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<number | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [dragging, setDragging] = useState(false)

  const close = useCallback(() => {
    setClosing(true)
    window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
      setDrag(0)
      trigger.current?.focus()
    }, CLOSE_DURATION)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    sheet.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return
    setDrag(Math.max(0, event.clientY - dragStart.current))
  }
  const onPointerUp = () => {
    if (dragStart.current === null) return
    dragStart.current = null
    setDragging(false)
    if (drag > CLOSE_DISTANCE) close()
    else setDrag(0)
  }

  const offset = closing ? '100%' : `${drag}px`

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className={`inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg text-sm font-bold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-500)] ${className}`}>
        Légende
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[60]">
          <div aria-hidden="true" onClick={close}
            className={`legend-backdrop absolute inset-0 bg-black/55 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`} />
          <div ref={sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
            className="legend-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--surface)] text-[var(--ink)] shadow-[0_-12px_40px_rgb(0_0_0/30%)] outline-none"
            style={{ transform: `translateY(${offset})`, transition: !dragging ? `transform ${CLOSE_DURATION}ms ease` : 'none' }}>
            <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              className="shrink-0 cursor-grab touch-none px-6 pb-3 pt-2 active:cursor-grabbing">
              <button type="button" onClick={close} aria-label="Fermer la légende"
                className="mx-auto mb-4 flex h-6 w-24 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[var(--gold-500)]">
                <span aria-hidden="true" className="block h-1.5 w-12 rounded-full bg-[var(--ink-soft)] opacity-40" />
              </button>
              <h2 id={titleId} className="text-2xl font-bold">{title}</h2>
            </div>
            <div className="overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <dl className="grid">
              {items.map(([abbr, definition]) => (
                <div key={abbr} className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-baseline gap-3 py-2.5">
                  <dt className="text-[15px] font-semibold uppercase text-[var(--ink-soft)]">{abbr}</dt>
                  <dd className="text-[17px]">{definition}</dd>
                </div>
              ))}
            </dl>
            {children}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
