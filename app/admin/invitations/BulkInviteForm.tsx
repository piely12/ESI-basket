'use client'

import { useMemo, useState } from 'react'
import { inviteAccountsInBulk } from '../actions'
import { isValidEmail, normalizeEmail } from '@/lib/validation'

type Profile = { ref: string; name: string; label: string; role: string; status: string; email: string | null }
type Row = { email: string; note: string }
type Outcome = { ok: boolean; message: string }

const BATCH = 3
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const ROLE_WORDS: Record<string, string[]> = {
  coach_adjoint: ['coach adjoint', 'adjoint'],
  statisticienne: ['statisticienne', 'stats'],
  coach: ['coach principal'],
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Associe chaque ligne « 3 - AMON Jean Loïc : adresse » à une fiche. */
function matchList(text: string, profiles: Profile[]) {
  const open = profiles.filter((profile) => profile.status === 'non rattaché')
  const assigned = new Map<string, Row>()
  const unmatched: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const emails = line.match(EMAIL_RE)
    if (!emails?.length) continue
    const rawName = line.slice(0, line.indexOf(emails[0])).replace(/^\s*\d+\s*[-–.)]\s*/, '').replace(/[:\s]+$/, '')
    const name = normalize(rawName)
    const note = emails.length > 1 ? `${emails.length} adresses dans la liste : la première est utilisée.` : ''

    const byRole = Object.entries(ROLE_WORDS).find(([, words]) => words.some((word) => name.includes(word)))
    let candidates: Profile[] = []
    if (byRole) {
      candidates = open.filter((profile) => profile.role === byRole[0])
    } else {
      const tokens = name.split(' ').filter((token) => token.length >= 2)
      let best = 0
      for (const profile of open.filter((item) => item.role === 'joueur')) {
        const profileTokens = new Set(normalize(profile.name).split(' '))
        const score = tokens.filter((token) => profileTokens.has(token)).length
        if (score > best) { best = score; candidates = [profile] } else if (score === best && score > 0) candidates.push(profile)
      }
    }
    const target = candidates.length === 1 ? candidates[0] : null
    if (!target || assigned.has(target.ref)) { unmatched.push(line.trim().slice(0, 120)); continue }
    assigned.set(target.ref, { email: normalizeEmail(emails[0]), note })
  }
  return { assigned, unmatched }
}

export default function BulkInviteForm({ profiles }: { profiles: Profile[] }) {
  const [list, setList] = useState('')
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const open = profiles.filter((profile) => profile.status === 'non rattaché')
  const linked = profiles.filter((profile) => profile.status !== 'non rattaché')
  const ready = useMemo(() => open.filter((profile) => {
    const email = normalizeEmail(rows[profile.ref]?.email)
    return email && isValidEmail(email) && !outcomes[profile.ref]?.ok
  }), [open, rows, outcomes])

  function applyList() {
    const { assigned, unmatched: rest } = matchList(list, profiles)
    setRows(Object.fromEntries(assigned))
    setUnmatched(rest)
    setOutcomes({})
    setError(assigned.size ? '' : 'Aucune adresse n’a pu être associée. Vérifie la liste.')
  }

  async function send() {
    if (sending || !ready.length) return
    if (!window.confirm(`Envoyer ${ready.length} invitation${ready.length > 1 ? 's' : ''} par e-mail ?`)) return
    setSending(true)
    setError('')
    const queue = ready.map((profile) => ({ profile_ref: profile.ref, email: normalizeEmail(rows[profile.ref].email) }))
    for (let index = 0; index < queue.length; index += BATCH) {
      setProgress(`Envoi ${Math.min(index + BATCH, queue.length)} / ${queue.length}…`)
      try {
        const response = await inviteAccountsInBulk(queue.slice(index, index + BATCH))
        if (response.error) { setError(response.error); break }
        setOutcomes((current) => ({ ...current, ...Object.fromEntries(response.results.map((item) => [item.ref, { ok: item.ok, message: item.message }])) }))
      } catch {
        setError('Connexion interrompue. Les invitations déjà envoyées sont conservées : relance l’envoi pour les autres.')
        break
      }
    }
    setProgress('')
    setSending(false)
  }

  const sent = Object.values(outcomes).filter((item) => item.ok).length
  const failed = Object.values(outcomes).filter((item) => !item.ok).length

  return <div className="space-y-6">
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="paste-title">
      <h2 id="paste-title" className="font-display text-2xl text-brand">1. Colle la liste</h2>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">Une personne par ligne, par exemple « 3 - AMON Jean Loïc : adresse@gmail.com » ou « Coach adjoint : adresse@gmail.com ».</p>
      <label htmlFor="bulk-list" className="sr-only">Liste des adresses</label>
      <textarea id="bulk-list" value={list} onChange={(event) => setList(event.target.value)} rows={8} spellCheck={false}
        className="auth-input mt-3 min-h-40 w-full resize-y py-3 font-mono text-sm" placeholder={'2 - CHRIS-IVANN : adresse@gmail.com\n3 - AMON Jean Loïc : adresse@gmail.com'} />
      <button type="button" onClick={applyList} disabled={!list.trim()} className="mt-3 min-h-12 rounded-xl bg-maroon-panel px-5 font-semibold text-on-brand transition hover:bg-[var(--maroon-700)] disabled:opacity-50">Associer les adresses</button>
      {unmatched.length > 0 && <div role="status" className="mt-4 rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning">
        <p className="font-bold">{unmatched.length} ligne{unmatched.length > 1 ? 's' : ''} sans fiche trouvée : saisis l’adresse à la main ci-dessous.</p>
        <ul className="mt-1 list-inside list-disc">{unmatched.map((line) => <li key={line} className="truncate">{line}</li>)}</ul>
      </div>}
    </section>

    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="check-title">
      <h2 id="check-title" className="font-display text-2xl text-brand">2. Vérifie et envoie</h2>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">{open.length} fiche{open.length > 1 ? 's' : ''} sans compte. Corrige une adresse si besoin.</p>
      {open.length === 0 ? <p className="mt-4 rounded-xl bg-[var(--paper)] p-4 text-sm text-[var(--ink-soft)]">Toutes les fiches ont déjà un compte.</p> : <ul className="mt-4 divide-y divide-[var(--line)]">
        {open.map((profile) => {
          const row = rows[profile.ref]
          const outcome = outcomes[profile.ref]
          const email = row?.email ?? ''
          const invalid = email.trim() !== '' && !isValidEmail(normalizeEmail(email))
          return <li key={profile.ref} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{profile.label}</p>
              {row?.note && <p className="text-xs text-warning">{row.note}</p>}
            </div>
            <div className="min-w-0">
              <label htmlFor={`email-${profile.ref}`} className="sr-only">Adresse e-mail de {profile.name}</label>
              <input id={`email-${profile.ref}`} type="email" inputMode="email" autoComplete="off" spellCheck={false}
                value={email} disabled={sending || outcome?.ok} aria-invalid={invalid || undefined}
                onChange={(event) => setRows((current) => ({ ...current, [profile.ref]: { email: event.target.value, note: '' } }))}
                placeholder="Pas d’invitation" className="auth-input w-full text-sm" />
              {outcome && <p role={outcome.ok ? 'status' : 'alert'} className={`mt-1 text-xs ${outcome.ok ? 'text-success' : 'text-danger'}`}>{outcome.ok ? 'Invitation envoyée' : outcome.message}</p>}
              {invalid && <p className="mt-1 text-xs text-danger">Adresse invalide</p>}
            </div>
          </li>
        })}
      </ul>}

      {open.length > 0 && <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
        <button type="button" onClick={() => void send()} disabled={sending || !ready.length} className="min-h-12 rounded-xl bg-maroon-panel px-5 font-semibold text-on-brand transition hover:bg-[var(--maroon-700)] disabled:cursor-not-allowed disabled:opacity-50">
          {sending ? progress : `Envoyer ${ready.length} invitation${ready.length > 1 ? 's' : ''}`}
        </button>
        {(sent > 0 || failed > 0) && !sending && <p role="status" className="text-sm text-[var(--ink-soft)]">{sent} envoyée{sent > 1 ? 's' : ''}{failed ? ` · ${failed} en échec` : ''}</p>}
      </div>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>

    {linked.length > 0 && <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="linked-title">
      <h2 id="linked-title" className="font-display text-2xl text-brand">Déjà rattachés</h2>
      <ul className="mt-3 divide-y divide-[var(--line)] text-sm">
        {linked.map((profile) => <li key={profile.ref} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
          <span className="font-semibold text-[var(--ink)]">{profile.label}</span>
          <span className="text-[var(--ink-soft)]">{profile.email ?? '—'} · {profile.status}</span>
        </li>)}
      </ul>
    </section>}
  </div>
}
