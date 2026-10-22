'use client'

import { useEffect, useRef, useState } from 'react'

type TeamKey = 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'personal_fouls' | 'fg_made' | 'fg_attempted' | 'three_made' | 'three_attempted' | 'ft_made' | 'ft_attempted'
type TeamDraft = Record<TeamKey, number | null>
type Draft = { home_score: number | null; away_score: number | null; home_team: TeamDraft; away_team: TeamDraft }
const keys: TeamKey[] = ['points','rebounds','assists','steals','blocks','turnovers','personal_fouls','fg_made','fg_attempted','three_made','three_attempted','ft_made','ft_attempted']
const labels: Record<TeamKey,string> = { points:'Points',rebounds:'Rebonds',assists:'Passes décisives',steals:'Interceptions',blocks:'Contres',turnovers:'Balles perdues',personal_fouls:'Fautes',fg_made:'Tirs réussis',fg_attempted:'Tirs tentés',three_made:'3 pts réussis',three_attempted:'3 pts tentés',ft_made:'Lancers réussis',ft_attempted:'Lancers tentés' }
const blank = (): TeamDraft => Object.fromEntries(keys.map((key) => [key,null])) as TeamDraft

export default function CollectiveStatsEditor({ matchId, homeName, awayName, scores, homeStats, awayStats, locked = false }: {
  matchId: string; homeName: string; awayName: string; scores: [number | null,number | null]; homeStats: Partial<TeamDraft>; awayStats: Partial<TeamDraft>; locked?: boolean
}) {
  const [draft,setDraft] = useState<Draft>({ home_score:scores[0],away_score:scores[1],home_team:{...blank(),...homeStats},away_team:{...blank(),...awayStats} })
  const [state,setState] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [error,setError] = useState('')
  const draftRef = useRef(draft)
  const dirty = useRef(false)
  useEffect(() => {
    if (locked || !dirty.current) return
    const timer = setTimeout(async () => {
      setState('saving')
      try {
        const response = await fetch(`/api/stats/${matchId}`,{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save-collective',...draftRef.current})})
        if (!response.ok) throw new Error()
        dirty.current = false
        setState('saved'); setError('')
      } catch { setState('error'); setError('La sauvegarde a échoué. Vérifie ta connexion et réessaie.') }
    },600)
    return () => clearTimeout(timer)
  },[draft,locked,matchId])
  function change<K extends keyof Draft>(key: K, value: Draft[K]) { const next={...draftRef.current,[key]:value}; draftRef.current=next; dirty.current=true;setDraft(next) }
  function teamChange(team:'home_team'|'away_team',key:TeamKey,value:string) { const next={...draftRef.current,[team]:{...draftRef.current[team],[key]:value===''?null:Number(value)}};draftRef.current=next;dirty.current=true;setDraft(next) }
  const input='min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)] disabled:opacity-60'
  return <div className="space-y-5">
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Statistiques collectives</p><h2 className="font-display text-2xl text-brand">Score du match</h2></div><span role="status" aria-live="polite" className="text-xs text-[var(--ink-soft)]">{locked?'Publié':state==='saving'?'Sauvegarde…':state==='saved'?'Brouillon sauvegardé':state==='error'?'Erreur de sauvegarde':'Sauvegarde automatique'}</span></div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3"><label className="grid gap-1 text-sm font-semibold text-[var(--ink-soft)]">{homeName}<input type="number" min="0" max="200" disabled={locked} value={draft.home_score??''} onChange={e=>change('home_score',e.target.value===''?null:Number(e.target.value))} className={input}/></label><span className="pb-3 font-display text-2xl text-[var(--gold-deep)]">:</span><label className="grid gap-1 text-sm font-semibold text-[var(--ink-soft)]">{awayName}<input type="number" min="0" max="200" disabled={locked} value={draft.away_score??''} onChange={e=>change('away_score',e.target.value===''?null:Number(e.target.value))} className={input}/></label></div>
    </section>
    {(['home_team','away_team'] as const).map((team,index)=><section key={team} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Équipe {index===0?'à domicile':'à l’extérieur'}</p><h2 className="font-display text-2xl text-brand">{index===0?homeName:awayName}</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{keys.map(key=><label key={key} className="grid gap-1 text-xs font-semibold text-[var(--ink-soft)]">{labels[key]}<input type="number" min="0" max="300" disabled={locked} value={draft[team][key]??''} onChange={e=>teamChange(team,key,e.target.value)} className={input}/></label>)}</div><p className="mt-3 text-xs text-[var(--ink-soft)]">Laisse vide si la donnée n’est pas encore disponible; 0 signifie zéro confirmé.</p></section>)}
    {error&&<p role="alert" className="rounded-lg border border-danger-border bg-danger-bg p-3 text-sm text-danger">{error}</p>}
  </div>
}
