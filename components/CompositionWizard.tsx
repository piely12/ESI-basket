'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import TeamLogo from '@/components/TeamLogo'
import CompositionBoard from '@/components/CompositionBoard'
import { COURT_SLOTS, type CourtSlot, type LineupEntry, type LineupPlayer } from '@/lib/lineup'
import type { Team } from '@/lib/data/public'
import { publishMatchComposition, saveMatchCompositionDraft, type MatchAvailability } from '@/app/coach/actions'
import styles from './composition-wizard.module.css'

type Availability = MatchAvailability['availability_status']
type WorkflowStatus = 'brouillon' | 'publiee' | 'verrouillee'
type AvailabilityDraft = { player_id: string; availability_status: Availability }

export default function CompositionWizard({
  matchId, team, opponent, scheduledAt, location, kickoffConfirmed, coachName, players,
  initialAvailability, initialSelectedIds, initialSlots, initialStatus, canOverrideLock, requireSeventeenPlayers = false,
  saveAction = saveMatchCompositionDraft, publishAction = publishMatchComposition,
}: {
  matchId: string
  team: Team
  opponent: Team
  scheduledAt: string
  location: string | null
  kickoffConfirmed: boolean
  coachName: string | null
  players: LineupPlayer[]
  initialAvailability: AvailabilityDraft[]
  initialSelectedIds: string[]
  initialSlots: Partial<Record<CourtSlot, string>>
  initialStatus: WorkflowStatus
  canOverrideLock: boolean
  requireSeventeenPlayers?: boolean
  saveAction?: typeof saveMatchCompositionDraft
  publishAction?: typeof publishMatchComposition
}) {
  const router = useRouter()
  const [availability, setAvailability] = useState<Record<string, Availability>>(() => Object.fromEntries([
    ...players.map((player) => [player.id, 'disponible' as Availability] as const),
    ...initialAvailability.map((entry) => [entry.player_id, entry.availability_status] as const),
  ]))
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [slots, setSlots] = useState<Partial<Record<CourtSlot, string>>>(initialSlots)
  const [step, setStep] = useState<1 | 2 | 3>(() => initialStatus === 'publiee' || initialStatus === 'verrouillee' ? 3 : initialSelectedIds.length === 12 ? (Object.keys(initialSlots).length === 5 ? 3 : 2) : 1)
  const [status, setStatus] = useState<WorkflowStatus>(initialStatus)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const availablePlayers = players.filter((player) => availability[player.id] === 'disponible')
  const canSelectTwelve = availablePlayers.length >= 12 && selectedIds.length === 12
  const validRosterSize = !requireSeventeenPlayers || players.length === 17
  const slotEntries = useMemo(() => COURT_SLOTS.flatMap((slot) => {
    const player = players.find((candidate) => candidate.id === slots[slot.key])
    return player ? [{ player, is_starter: true, court_slot: slot.key }] as LineupEntry[] : []
  }), [players, slots])
  const benchEntries = selectedIds.flatMap((id) => {
    if (Object.values(slots).includes(id)) return []
    const player = players.find((candidate) => candidate.id === id)
    return player ? [{ player, is_starter: false, court_slot: null }] as LineupEntry[] : []
  }).sort((a, b) => (a.player.jersey_number ?? 100) - (b.player.jersey_number ?? 100))
  const sortedPlayers = [...players].sort((a, b) => (a.jersey_number ?? 100) - (b.jersey_number ?? 100))
  const statusText = status === 'publiee' ? 'Publiée' : status === 'verrouillee' ? 'Verrouillée' : 'Brouillon'
  const locked = status === 'verrouillee' && !canOverrideLock

  function payload() {
    const allAvailability = players.map((player) => ({ player_id: player.id, availability_status: availability[player.id] ?? 'disponible' }))
    return { matchId, teamId: team.id, availability: allAvailability, selectedPlayerIds: selectedIds, courtSlots: slots }
  }

  function persistDraft() {
    startTransition(async () => {
      setMessage('')
      const result = await saveAction(payload())
      setMessage(result.ok ? 'Brouillon enregistré.' : result.error ?? 'Impossible d’enregistrer le brouillon.')
      if (result.ok) setStatus((current) => current === 'publiee' ? current : 'brouillon')
    })
  }

  function advance(next: 2 | 3) {
    startTransition(async () => {
      setMessage('')
      const result = await saveAction(payload())
      if (!result.ok) { setMessage(result.error ?? 'Impossible d’enregistrer le brouillon.'); return }
      setStatus((current) => current === 'publiee' ? current : 'brouillon')
      setStep(next)
    })
  }

  function publish() {
    startTransition(async () => {
      setMessage('')
      const saved = await saveAction(payload())
      if (!saved.ok) { setMessage(saved.error ?? 'Impossible de vérifier le brouillon.'); return }
      const result = await publishAction(matchId, team.id)
      if (!result.ok) { setMessage(result.error ?? 'La publication a échoué.'); return }
      setStatus('publiee')
       setMessage('Composition publiée. Les joueurs dont le compte est rattaché reçoivent une notification dans leur espace.')
      router.refresh()
    })
  }

  function toggleSelected(playerId: string) {
    if (availability[playerId] !== 'disponible') return
    setSelectedIds((current) => current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : current.length < 12 ? [...current, playerId] : current)
  }

  function setPlayerAvailability(playerId: string, value: Availability) {
    setAvailability((current) => ({ ...current, [playerId]: value }))
    if (value !== 'disponible') setSelectedIds((current) => current.filter((id) => id !== playerId))
    setSlots((current) => Object.fromEntries(Object.entries(current).filter(([, id]) => id !== playerId)) as Partial<Record<CourtSlot, string>>)
  }

  function assignSlot(playerId: string, target: CourtSlot) {
    setSlots((current) => {
      const existingSlot = COURT_SLOTS.find((slot) => current[slot.key] === playerId)?.key
      const targetPlayer = current[target]
      const updated = { ...current }
      if (existingSlot) updated[existingSlot] = targetPlayer
      updated[target] = playerId
      return updated
    })
  }

  function toggleStarter(playerId: string) {
    setSlots((current) => {
      const entry = COURT_SLOTS.find((slot) => current[slot.key] === playerId)
      if (entry) { const updated = { ...current }; delete updated[entry.key]; return updated }
      const open = COURT_SLOTS.find((slot) => !current[slot.key])
      return open ? { ...current, [open.key]: playerId } : current
    })
  }

  const date = new Date(scheduledAt).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan', day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = new Date(scheduledAt).toLocaleTimeString('fr-FR', { timeZone: 'Africa/Abidjan', hour: '2-digit', minute: '2-digit' })

  return <section className={styles.wizard} aria-label="Préparer la composition de l’équipe">
    <header className={styles.header}>
      <div className={styles.headerBrand}><div className={styles.esiLogo}><TeamLogo team={team} size={58} /></div><div><p className={styles.kicker}>Espace coach</p><h2>COMPOSITION D’ÉQUIPE</h2><p className={styles.coachName}>{coachName || 'Coach principal'}</p></div></div>
      <div className={styles.opponent}><span>VS {opponent.is_esi ? 'ESI' : opponent.name}</span><div className={styles.opponentMeta}>{date} · {kickoffConfirmed ? time : 'HORAIRE À CONFIRMER'} · {location || 'LIEU À CONFIRMER'}</div><div className={styles.opponentLogo}><TeamLogo team={opponent} size={64} /></div></div>
    </header>
    <div className={styles.progress} aria-label={'Étape ' + step + ' sur 3'}><div className={styles.progressSegments}>{[1,2,3].map((n) => <span key={n} className={n <= step ? styles.reached : ''} />)}</div><div className={styles.progressText}>ÉTAPE {step} SUR 3 · {step === 1 ? 'DISPONIBILITÉS ET 12 JOUEURS' : step === 2 ? 'CINQ MAJEURS' : 'APERÇU ET PUBLICATION'}</div></div>

    {step === 1 && <div className={styles.content}>
      <div className={styles.sectionTitle}><div><p className={styles.kicker}>Étape 1</p><h3>Disponibilités & sélection</h3></div><span className={styles.pill}>{statusText}</span></div>
      <p className={styles.muted}>Tous les joueurs sont disponibles par défaut. Choisis les 12 joueurs retenus pour ce match.</p>
      {!validRosterSize && <p role="alert" className={styles.warning}>L’effectif ESI doit contenir exactement 17 joueurs avant de préparer la composition.</p>}
      {availablePlayers.length < 12 && <p role="alert" className={styles.warning}>Seulement {availablePlayers.length} joueur{availablePlayers.length === 1 ? '' : 's'} disponible{availablePlayers.length === 1 ? '' : 's'} : il en faut 12 pour valider la composition.</p>}
      <div className={styles.playerGrid}>{sortedPlayers.map((player) => {
        const chosen = selectedIds.includes(player.id)
        const avail = availability[player.id] ?? 'disponible'
        return <article key={player.id} className={styles.playerCard + (chosen ? ' ' + styles.playerSelected : '') + (avail !== 'disponible' ? ' ' + styles.playerUnavailable : '')}>
          <button type="button" onClick={() => toggleSelected(player.id)} disabled={locked || avail !== 'disponible' || (!chosen && selectedIds.length >= 12)} className={styles.playerToggle} aria-pressed={chosen}>
            <span className={styles.jersey}>{player.jersey_number ?? '—'}</span><span className={styles.playerCopy}><strong>{player.first_name} {player.last_name}</strong><small>{player.position || 'Poste à définir'}</small></span><span className={styles.check}>{chosen ? 'RETENU' : 'AJOUTER'}</span>
          </button>
          <label className={styles.availabilityControl}><span>Pour ce match</span><select disabled={locked} aria-label={'Disponibilité de ' + player.first_name + ' ' + player.last_name} value={avail} onChange={(event) => setPlayerAvailability(player.id, event.target.value as Availability)}><option value="disponible">Disponible</option><option value="blesse">Blessé</option><option value="indisponible">Indisponible</option></select></label>
        </article>
      })}</div>
    </div>}

    {step === 2 && <div className={styles.content}>
      <div className={styles.sectionTitle}><div><p className={styles.kicker}>Étape 2</p><h3>Choisis tes cinq majeurs</h3></div><span className={styles.counter}>{Object.keys(slots).length}<small>/5 TITULAIRES</small></span></div>
      <p className={styles.muted}>Touche un joueur pour le nommer ou le retirer. Chaque poste ne peut être attribué qu’une fois; choisir un poste occupé échange les deux joueurs.</p>
      <div className={styles.groups}><section className={styles.group}><h4>LES CINQ MAJEURS</h4>{slotEntries.map(({ player, court_slot }) => <article key={player.id} className={styles.starterCard}><button type="button" className={styles.starterToggle} onClick={() => toggleStarter(player.id)} disabled={locked}><span className={styles.jersey}>{player.jersey_number ?? '—'}</span><span><strong>{player.first_name} {player.last_name}</strong><small>{player.position || 'Poste habituel à préciser'}</small></span></button><label className={styles.slotSelect}><span>Poste</span><select disabled={locked} value={court_slot ?? ''} onChange={(event) => assignSlot(player.id, event.target.value as CourtSlot)}>{COURT_SLOTS.map((slot) => <option key={slot.key} value={slot.key}>{slot.label} · {slot.key === 'meneur' ? 'PG' : slot.key === 'arriere' ? 'SG' : slot.key === 'ailier' ? 'SF' : slot.key === 'ailier_fort' ? 'PF' : 'C'}</option>)}</select></label></article>)}{slotEntries.length===0 && <p className={styles.muted}>Sélectionne cinq joueurs parmi les douze retenus.</p>}</section>
        <section className={styles.group}><h4>REMPLAÇANTS ({Math.max(0,selectedIds.length-slotEntries.length)})</h4><div className={styles.benchGrid}>{selectedIds.filter((id) => !Object.values(slots).includes(id)).map((id) => {const player=players.find((p)=>p.id===id);return player&&<button key={id} type="button" className={styles.benchPlayer} onClick={()=>toggleStarter(id)} disabled={locked}><span className={styles.jersey}>{player.jersey_number ?? '—'}</span><span><strong>{player.first_name} {player.last_name}</strong><small>{player.position || 'Poste à préciser'}</small></span><span className={styles.addStarter}>AJOUTER</span></button>})}</div></section></div>
    </div>}

    {step === 3 && <div className={styles.previewContent}>
      <div className={styles.sectionTitle}><div><p className={styles.kicker}>Étape 3</p><h3>Aperçu de la composition</h3></div><span className={styles.pill}>{statusText}</span></div>
      <CompositionBoard matchId={matchId} team={team} opponent={opponent} scheduledAt={scheduledAt} location={location} coachName={coachName} starters={slotEntries} bench={benchEntries} />
    </div>}

    {message && <p role="status" className={message.includes('échoué')||message.includes('Impossible')||message.includes('exactement')||message.includes('verrouillée') ? styles.error : styles.success}>{message}</p>}

    <footer className={styles.actionBar}>
      <div className={styles.actionCount}><strong>{step===1 ? selectedIds.length+'/12' : step===2 ? Object.keys(slots).length+'/5' : statusText}</strong><span>{step===1 ? 'JOUEURS RETENUS' : step===2 ? 'TITULAIRES CHOISIS' : 'STATUT DE LA COMPOSITION'}</span></div>
      <div className={styles.actions}>
        {step>1 && <button type="button" className={styles.secondaryButton} disabled={isPending} onClick={()=>setStep((step-1) as 1|2)}>Retour</button>}
        {step===1 && <button type="button" className={styles.secondaryButton} disabled={isPending||locked} onClick={persistDraft}>Enregistrer le brouillon</button>}
        {step===1 && <button type="button" className={styles.primaryButton} disabled={locked||!validRosterSize||!canSelectTwelve||isPending} onClick={()=>advance(2)}>{isPending?'Enregistrement…':'Suivant'}</button>}
        {step===2 && <><button type="button" className={styles.secondaryButton} disabled={isPending||locked} onClick={persistDraft}>Brouillon</button><button type="button" className={styles.primaryButton} disabled={locked||Object.keys(slots).length!==5||isPending} onClick={()=>advance(3)}>{isPending?'Enregistrement…':'Aperçu'}</button></>}
        {step===3 && <><button type="button" className={styles.secondaryButton} disabled={isPending} onClick={persistDraft}>Enregistrer le brouillon</button><button type="button" className={styles.primaryButton} disabled={locked||isPending||!validRosterSize||selectedIds.length!==12||Object.keys(slots).length!==5||availablePlayers.length<12} onClick={publish}>{isPending?'Publication…':status==='publiee'?'Confirmer la mise à jour':'Confirmer et publier'}</button></>}
      </div>
    </footer>
  </section>
}
