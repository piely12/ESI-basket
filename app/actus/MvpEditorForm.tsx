'use client'

import { useActionState } from 'react'
import { saveMvpAward, type EditorialState } from './actions'

const INITIAL: EditorialState = { error: '', success: '' }
const fieldClass = 'min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus-visible:border-[var(--gold-deep)] focus-visible:ring-2 focus-visible:ring-[var(--gold-500)]/30'

export default function MvpEditorForm({
  matchId,
  players,
  currentHeadline,
}: {
  matchId: string
  players: { id: string; first_name: string; last_name: string; jersey_number: number | null }[]
  currentHeadline: string | null
}) {
  const [state, formAction, pending] = useActionState(saveMvpAward, INITIAL)
  if (!players.length) return <p className="rounded-lg bg-[var(--paper)] p-4 text-sm text-[var(--ink-soft)]">Publie d’abord la feuille de statistiques de ce match. Les joueurs admissibles apparaîtront ensuite.</p>

  return <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <input type="hidden" name="match_id" value={matchId} />
    <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">Joueur MVP
      <select name="player_id" required defaultValue="" className={fieldClass}>
        <option value="" disabled>Choisir un joueur</option>
        {players.map((player) => <option key={player.id} value={player.id}>#{player.jersey_number ?? '—'} {player.first_name} {player.last_name}</option>)}
      </select>
    </label>
    <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">Titre de la une
      <input name="headline" maxLength={120} defaultValue={currentHeadline ?? ''} className={fieldClass} placeholder="Une performance qui fait la différence" />
    </label>
    <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-[var(--maroon-900)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">
      {pending ? 'Enregistrement…' : 'Mettre en avant'}
    </button>
    <p role={state.error ? 'alert' : 'status'} aria-live="polite" className={`sm:col-span-3 text-sm ${state.error ? 'text-red-700' : 'text-[var(--maroon-900)]'}`}>{state.error || state.success}</p>
  </form>
}
