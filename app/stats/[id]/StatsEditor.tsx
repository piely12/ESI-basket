'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type PlayerKey = 'minutes_played' | 'points' | 'personal_fouls' | 'rebounds_defensive' | 'rebounds_offensive' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'fg_made' | 'fg_attempted' | 'three_made' | 'three_attempted' | 'ft_made' | 'ft_attempted'
type TeamKey = 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'personal_fouls' | 'fg_made' | 'fg_attempted' | 'three_made' | 'three_attempted' | 'ft_made' | 'ft_attempted'
type Player = { id: string; first_name: string; last_name: string; jersey_number: number | null; position: string | null }
export type PlayerDraft = { player_id: string } & Record<PlayerKey, number | null>
export type TeamDraft = Record<TeamKey, number | null>
export type Draft = { esi_score: number | null; opponent_score: number | null; team: TeamDraft; players: PlayerDraft[] }
type Workflow = { status: string; review_warnings: string[]; result_checked: boolean; team_stats_checked: boolean; player_stats_checked: boolean; anomalies_checked: boolean; correction_reason: string | null }
type Props = { matchId: string; matchStatus: string; esiName: string; opponentName: string; players: Player[]; initial: Draft; workflow: Workflow }

const playerFields: { key: PlayerKey; label: string; max: number; step?: number }[] = [
  { key: 'minutes_played', label: 'Minutes', max: 60, step: 0.5 }, { key: 'points', label: 'Points', max: 150 },
  { key: 'fg_made', label: 'Tirs reussis', max: 100 }, { key: 'fg_attempted', label: 'Tirs tentes', max: 150 },
  { key: 'three_made', label: '3 pts reussis', max: 100 }, { key: 'three_attempted', label: '3 pts tentes', max: 150 },
  { key: 'ft_made', label: 'Lancers reussis', max: 100 }, { key: 'ft_attempted', label: 'Lancers tentes', max: 150 },
  { key: 'rebounds_defensive', label: 'Rebonds defensifs', max: 100 }, { key: 'rebounds_offensive', label: 'Rebonds offensifs', max: 100 },
  { key: 'assists', label: 'Passes decisives', max: 100 }, { key: 'steals', label: 'Interceptions', max: 100 },
  { key: 'blocks', label: 'Contres', max: 100 }, { key: 'turnovers', label: 'Balles perdues', max: 100 },
  { key: 'personal_fouls', label: 'Fautes personnelles', max: 5 },
]
const teamFields: { key: TeamKey; label: string; max: number }[] = [
  { key: 'points', label: 'Points', max: 200 }, { key: 'rebounds', label: 'Rebonds', max: 200 },
  { key: 'assists', label: 'Passes decisives', max: 200 }, { key: 'steals', label: 'Interceptions', max: 200 },
  { key: 'blocks', label: 'Contres', max: 200 }, { key: 'turnovers', label: 'Balles perdues', max: 200 },
  { key: 'personal_fouls', label: 'Fautes', max: 200 }, { key: 'fg_made', label: 'Tirs reussis', max: 200 },
  { key: 'fg_attempted', label: 'Tirs tentes', max: 300 }, { key: 'three_made', label: '3 pts reussis', max: 200 },
  { key: 'three_attempted', label: '3 pts tentes', max: 300 }, { key: 'ft_made', label: 'Lancers reussis', max: 200 },
  { key: 'ft_attempted', label: 'Lancers tentes', max: 300 },
]
const showNumber = (value: number | null) => value === null ? '' : String(value)

function getWarnings(draft: Draft) {
  const warnings: string[] = []
  if (draft.esi_score !== null && draft.team.points !== null && draft.esi_score !== draft.team.points) warnings.push('Le total de points de l\'equipe differe du score final ESI.')
  if (draft.esi_score !== null && draft.players.every((player) => player.points !== null)
    && draft.players.reduce((sum, player) => sum + (player.points ?? 0), 0) !== draft.esi_score) warnings.push('La somme des points individuels differe du score final ESI.')
  return warnings
}

export default function StatsEditor({ matchId, matchStatus, esiName, opponentName, players, initial, workflow }: Props) {
  const [draft, setDraft] = useState(initial)
  const [workflowStatus, setWorkflowStatus] = useState(workflow.status)
  const [reviewWarnings, setReviewWarnings] = useState(workflow.review_warnings)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [actionError, setActionError] = useState('')
  const [checks, setChecks] = useState({ result: false, team: false, players: false, anomalies: false })
  const [publishConfirmed, setPublishConfirmed] = useState(false)
  const [correctionReason, setCorrectionReason] = useState('')
  const draftRef = useRef(draft)
  const revision = useRef(0)
  const savedRevision = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef<Promise<boolean> | null>(null)
  const editable = !['publie', 'pret_a_publier'].includes(workflowStatus) && matchStatus === 'termine'
  const warnings = getWarnings(draft)

  const request = useCallback(async (payload: Record<string, unknown>) => {
    try {
      const method = payload.action === 'save' ? 'PATCH' : 'POST'
      const response = await fetch(`/api/stats/${matchId}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json() as { ok?: boolean; error?: string; result?: unknown }
      if (!response.ok) {
        const messages: Record<string, string> = {
          validation_failed: 'Complete les statistiques et corrige les incoherences avant de continuer.',
          workflow_conflict: 'Le statut de la feuille a change. Actualise la page puis reessaie.',
          forbidden: 'Cette action n\'est pas autorisee.', match_not_finished: 'La saisie est disponible apres la fin du match.',
          roster_changed: 'La liste des joueurs convoques a change. Actualise la page.', save_failed: 'Sauvegarde impossible. Verifie la connexion et reessaie.',
        }
        setActionError(messages[data.error ?? ''] ?? 'Action impossible. Verifie les informations et reessaie.')
        return null
      }
      setActionError('')
      return data
    } catch {
      setActionError('Connexion interrompue. Verifie le reseau puis reessaie.')
      return null
    }
  }, [matchId])

  const persist = useCallback(async (snapshot: Draft, currentRevision: number) => {
    if (inFlight.current) return inFlight.current
    setSaveState('saving')
    const promise = (async () => {
      const data = await request({ action: 'save', ...snapshot })
      if (!data) { setSaveState('error'); return false }
      savedRevision.current = currentRevision
      if (workflowStatus === 'pret_a_verifier' || workflowStatus === 'pret_a_publier') setWorkflowStatus('a_corriger')
      setSaveState('saved')
      return true
    })().finally(() => { inFlight.current = null })
    inFlight.current = promise
    return promise
  }, [request, workflowStatus])

  const flushSave = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    if (inFlight.current) await inFlight.current
    while (savedRevision.current < revision.current) {
      const currentRevision = revision.current
      if (!await persist(draftRef.current, currentRevision)) return false
    }
    return true
  }, [persist])

  useEffect(() => {
    if (revision.current === savedRevision.current || !editable) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void persist(draftRef.current, revision.current) }, 650)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [draft, editable, persist])

  function setScore(key: 'esi_score' | 'opponent_score', raw: string) {
    const next = { ...draftRef.current, [key]: raw === '' ? null : Number(raw) }
    draftRef.current = next; revision.current += 1; setDraft(next)
  }
  function setTeamValue(key: TeamKey, raw: string) {
    const next = { ...draftRef.current, team: { ...draftRef.current.team, [key]: raw === '' ? null : Number(raw) } }
    draftRef.current = next; revision.current += 1; setDraft(next)
  }
  function setPlayerValue(playerId: string, key: PlayerKey, raw: string) {
    const next = { ...draftRef.current, players: draftRef.current.players.map((player) => player.player_id === playerId ? { ...player, [key]: raw === '' ? null : Number(raw) } : player) }
    draftRef.current = next; revision.current += 1; setDraft(next)
  }
  async function prepareReview() {
    if (!await flushSave()) return
    const data = await request({ action: 'prepare-review' })
    if (data) { setReviewWarnings(Array.isArray(data.result) ? data.result as string[] : []); setWorkflowStatus('pret_a_verifier'); setChecks({ result: false, team: false, players: false, anomalies: false }) }
  }
  async function validateReview() {
    const data = await request({ action: 'validate-review', ...checks })
    if (data) setWorkflowStatus('pret_a_publier')
  }
  async function publish() {
    if (!publishConfirmed) return
    const data = await request({ action: 'publish' })
    if (data) setWorkflowStatus('publie')
  }
  async function reopen() {
    const action = workflowStatus === 'pret_a_publier' ? 'return-to-correction' : 'reopen'
    const data = await request({ action, reason: correctionReason })
    if (data) { setWorkflowStatus('a_corriger'); setCorrectionReason('') }
  }

  const outcome = draft.esi_score === null || draft.opponent_score === null ? '' : draft.esi_score === draft.opponent_score ? 'Egalite a verifier' : draft.esi_score > draft.opponent_score ? 'Victoire ESI' : 'Defaite ESI'
  const inputClass = 'min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] disabled:opacity-70'

  return <div className="space-y-6">
    {actionError && <p role="alert" aria-live="polite" className="rounded-xl border border-danger-border bg-danger-bg p-4 text-sm text-danger">{actionError}</p>}
    {workflowStatus === 'publie' && <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5"><p role="status" className="font-semibold text-[var(--ink)]">Statistiques publiees. Cette feuille est en lecture seule.</p>{workflow.correction_reason && <p className="mt-2 text-sm text-[var(--ink-soft)]">Motif precedent : {workflow.correction_reason}</p>}<label className="mt-4 grid gap-1 text-sm font-semibold text-[var(--ink)]">Motif de correction<textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} minLength={5} maxLength={500} rows={2} placeholder="Explique la correction a effectuer" className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]" /></label><button type="button" onClick={() => void reopen()} disabled={correctionReason.trim().length < 5} className="mt-3 min-h-11 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold disabled:opacity-50">Reouvrir pour correction</button></section>}

    {(editable || workflowStatus === 'pret_a_publier' || workflowStatus === 'publie') && <>
      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Etape 1 · resultat final</p><h2 className="font-display text-2xl text-brand">Score du match</h2></div>{editable && <p role="status" aria-live="polite" className="text-xs font-semibold text-[var(--ink-soft)]">{saveState === 'saving' ? 'Sauvegarde...' : saveState === 'saved' ? 'Sauvegarde effectuee' : saveState === 'error' ? 'Echec de sauvegarde' : 'Sauvegarde automatique'}</p>}</div><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3 sm:gap-5"><label className="grid gap-1 text-sm font-semibold text-[var(--ink-soft)]">{esiName}<input aria-label={`Score ${esiName}`} type="number" inputMode="numeric" min="0" max="200" disabled={!editable} value={showNumber(draft.esi_score)} onChange={(event) => setScore('esi_score', event.target.value)} className="min-h-14 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 text-center font-display text-4xl text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] disabled:opacity-70" /></label><span className="pb-3 font-display text-3xl text-[var(--gold-deep)]">:</span><label className="grid gap-1 text-sm font-semibold text-[var(--ink-soft)]">{opponentName}<input aria-label={`Score ${opponentName}`} type="number" inputMode="numeric" min="0" max="200" disabled={!editable} value={showNumber(draft.opponent_score)} onChange={(event) => setScore('opponent_score', event.target.value)} className="min-h-14 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 text-center font-display text-4xl text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] disabled:opacity-70" /></label></div>{outcome && <p className="mt-3 text-sm font-bold text-brand">{outcome}</p>}</section>
      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Etape 2 · total ESI</p><h2 className="font-display text-2xl text-brand">Statistiques d&apos;equipe</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{teamFields.map((field) => <label key={field.key} className="grid gap-1 text-xs font-semibold text-[var(--ink-soft)]"><span>{field.label}</span><input type="number" inputMode="numeric" min="0" max={field.max} disabled={!editable} value={showNumber(draft.team[field.key])} onChange={(event) => setTeamValue(field.key, event.target.value)} className={inputClass} /></label>)}</div><p className="mt-3 text-xs text-[var(--ink-soft)]">Les pourcentages sont derives des tirs reussis et tentes. Champ vide = non renseigne; 0 = zero confirme.</p>{editable && warnings.length > 0 && <p role="status" className="mt-2 text-sm font-medium text-warning">{warnings.join(' ')}</p>}</section>
      <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Etape 3 · joueurs convoques</p><h2 className="font-display text-3xl text-brand">Statistiques individuelles</h2></div><p className="text-xs text-[var(--ink-soft)]">{players.length} joueurs convoques</p></div>{players.map((player) => { const row = draft.players.find((stat) => stat.player_id === player.id); if (!row) return null; const rebounds = row.rebounds_defensive === null || row.rebounds_offensive === null ? null : row.rebounds_defensive + row.rebounds_offensive; const fgPercent = row.fg_made === null || row.fg_attempted === null || row.fg_attempted === 0 ? null : Math.round(row.fg_made / row.fg_attempted * 100); return <article key={player.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"><div className="mb-4 flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-maroon-panel font-display text-2xl text-[var(--gold-500)]">{player.jersey_number ?? '·'}</span><div className="min-w-0"><h3 className="truncate font-semibold text-[var(--ink)]">{player.first_name} {player.last_name}</h3><p className="text-xs text-[var(--ink-soft)]">{player.position || 'Poste non precise'}</p></div><p className="ml-auto text-right text-xs text-[var(--ink-soft)]">REB {rebounds ?? '—'}<br />FG {fgPercent === null ? '—' : `${fgPercent}%`}</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{playerFields.map((field) => <label key={field.key} className="grid gap-1 text-xs font-semibold text-[var(--ink-soft)]"><span>{field.label}</span><input type="number" inputMode={field.step ? 'decimal' : 'numeric'} min="0" max={field.max} step={field.step ?? 1} disabled={!editable} value={showNumber(row[field.key])} onChange={(event) => setPlayerValue(player.id, field.key, event.target.value)} className={inputClass} /></label>)}</div></article> })}</section>
    </>}

    {editable && <div className="sticky bottom-2 z-10 flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/95 p-3 shadow-lg backdrop-blur dark:backdrop-blur-none sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[var(--ink-soft)]">Brouillon prive · aucun resultat n&apos;est publie avant validation.</p><button type="button" onClick={() => void prepareReview()} disabled={saveState === 'saving' || saveState === 'error'} className="min-h-11 rounded-lg bg-maroon-panel px-5 py-2 text-sm font-bold text-on-brand hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">Terminer la saisie et verifier</button></div>}
    {workflowStatus === 'pret_a_verifier' && <section className="space-y-4 rounded-xl border-2 border-[var(--gold-deep)] bg-[var(--surface)] p-4 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Checkpoint humain</p><h2 className="font-display text-3xl text-brand">Verifie avant publication</h2></div>{!!reviewWarnings.length && <div role="alert" className="rounded-lg border border-warning-border bg-warning-bg p-3 text-sm text-warning"><h3 className="font-bold">Ecarts a verifier</h3><ul className="mt-1 list-inside list-disc">{reviewWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}<div className="grid gap-3 sm:grid-cols-2">{([['result', 'Score final verifie'], ['team', 'Totaux equipe verifies'], ['players', 'Joueurs convoques verifies'], ['anomalies', 'Ecarts signales examines']] as const).map(([key, label]) => <label key={key} className="flex min-h-12 items-center gap-3 rounded-lg border border-[var(--line)] p-3 text-sm font-medium text-[var(--ink)]"><input type="checkbox" checked={checks[key]} onChange={(event) => setChecks((current) => ({ ...current, [key]: event.target.checked }))} className="size-5 accent-[var(--maroon-900)]" />{label}</label>)}</div><button type="button" onClick={() => void validateReview()} disabled={!checks.result || !checks.team || !checks.players || (reviewWarnings.length > 0 && !checks.anomalies)} className="min-h-11 rounded-lg bg-maroon-panel px-5 py-2 text-sm font-bold text-on-brand disabled:opacity-50">Valider la verification</button></section>}
    {workflowStatus === 'pret_a_publier' && <section className="rounded-xl border-2 border-[var(--gold-deep)] bg-[var(--surface)] p-4 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Derniere etape</p><h2 className="font-display text-3xl text-brand">Pret a publier</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">La publication rendra ces statistiques visibles.</p><label className="mt-4 flex items-center gap-3 text-sm font-semibold text-[var(--ink)]"><input type="checkbox" checked={publishConfirmed} onChange={(event) => setPublishConfirmed(event.target.checked)} className="size-5 accent-[var(--maroon-900)]" />Je confirme la publication de cette feuille.</label><button type="button" onClick={() => void publish()} disabled={!publishConfirmed} className="mt-4 min-h-11 rounded-lg bg-maroon-panel px-5 py-2 text-sm font-bold text-on-brand disabled:opacity-50">Publier les statistiques</button><label className="mt-5 grid gap-1 text-sm font-semibold text-[var(--ink)]">Besoin de corriger? Indique le motif<textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} minLength={5} maxLength={500} rows={2} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 font-normal" /></label><button type="button" onClick={() => void reopen()} disabled={correctionReason.trim().length < 5} className="mt-2 min-h-11 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold disabled:opacity-50">Retourner aux corrections</button></section>}
  </div>
}
