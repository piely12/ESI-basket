'use client'

import { useState } from 'react'

type ShareTeam = { name: string; isEsi: boolean }
type SharePlayer = { number: number | null; firstName: string; lastName: string; role: string | null }
export type ShareKind = 'poster' | 'lineup' | 'score'

export default function MatchShareIcon({ matchId, home, away, date, venue, round, homeScore, awayScore, composition, kind, className }: {
  matchId: string
  home: ShareTeam
  away: ShareTeam
  date: string
  venue: string
  round: number | null
  homeScore: number | null
  awayScore: number | null
  composition: SharePlayer[]
  kind: ShareKind
  className: string
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const label = kind === 'lineup' ? 'Partager la composition' : kind === 'score' ? 'Partager le score final' : "Partager l'affiche"

  async function share() {
    if (busy || (kind === 'lineup' && composition.length < 5) || (kind === 'score' && (homeScore === null || awayScore === null))) return
    setBusy(true)
    setMessage('')
    try {
      const width = 1080
      const height = 1600
      const matchLabel = round ? `JOURNÉE ${round}` : 'CHAMPIONNAT'
      const headline = kind === 'lineup' ? 'COMPOSITION' : kind === 'score' ? 'SCORE FINAL' : 'AFFICHE DU MATCH'
      const logo = home.isEsi ? `<image href="${window.location.origin}/logos/esi.png" x="70" y="72" width="92" height="92" preserveAspectRatio="xMidYMid meet"/>` : ''
      const scoreText = homeScore !== null && awayScore !== null ? `${homeScore} — ${awayScore}` : 'VS'
      const teamBlock = `<text x="540" y="445" text-anchor="middle" class="team">${escapeXml(home.name)}</text><text x="540" y="526" text-anchor="middle" class="versus">${kind === 'score' ? scoreText : 'VS'}</text><text x="540" y="610" text-anchor="middle" class="team">${escapeXml(away.name)}</text>`
      const compositionBlock = kind === 'lineup' ? `<text x="78" y="735" class="section">TITULAIRES</text>${composition.slice(0, 5).map((player, index) => playerRow(player, index, 785)).join('')}<text x="78" y="1050" class="section">REMPLAÇANTS</text>${composition.slice(5, 12).map((player, index) => playerRow(player, index, 1090)).join('')}` : ''
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#46101c"/><stop offset="1" stop-color="#17090c"/></linearGradient><linearGradient id="gold" x2="1"><stop stop-color="#f8ca55"/><stop offset="1" stop-color="#d89a25"/></linearGradient><style>.small{font:600 25px Arial,sans-serif;letter-spacing:6px;fill:#f8ca55}.title{font:700 42px Arial,sans-serif;letter-spacing:5px;fill:#fff8e9}.team{font:700 58px Arial,sans-serif;fill:#fff8e9}.versus{font:700 42px Arial,sans-serif;fill:#f8ca55}.section{font:700 26px Arial,sans-serif;letter-spacing:5px;fill:#f8ca55}.name{font:600 29px Arial,sans-serif;fill:#fff8e9}.role{font:500 19px Arial,sans-serif;fill:#ddcdb5}.number{font:700 28px Arial,sans-serif;fill:#17100a}.foot{font:500 23px Arial,sans-serif;fill:#ddcdb5}</style></defs><rect width="1080" height="1600" fill="url(#bg)"/><rect x="28" y="28" width="1024" height="1544" rx="36" fill="none" stroke="#e8b448" stroke-opacity=".7" stroke-width="3"/><path d="M70 202H1010" stroke="#e8b448" stroke-opacity=".45" stroke-width="2"/>${logo}<text x="${home.isEsi ? 190 : 78}" y="122" class="small">THE LIONS OF ESI</text><text x="78" y="278" class="title">${headline}</text><text x="78" y="333" class="foot">${matchLabel} · ${escapeXml(date.toUpperCase())}</text>${teamBlock}<text x="540" y="690" text-anchor="middle" class="foot">${escapeXml(venue || 'Lieu à confirmer')}</text>${compositionBlock}<text x="78" y="1515" class="small">THE LIONS OF ESI</text><text x="1002" y="1515" text-anchor="end" class="foot">ESI BASKET</text></svg>`
      const png = await svgToPng(svg, width, height)
      const filename = `esi-${kind}-${matchId.slice(0, 8)}.png`
      const file = new File([png], filename, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: headline, text: `${home.name} — ${away.name} · ${date}` })
      } else {
        downloadBlob(png, filename)
        setMessage('Image téléchargée. Tu peux la joindre dans WhatsApp ou Snapchat.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage('Le partage direct est indisponible. Réessaie ou télécharge l’image.')
    } finally {
      setBusy(false)
    }
  }

  return <button type="button" aria-label={label} title={message || label} disabled={busy} onClick={() => void share()} className={className}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.1M8.7 13.4l6.6 4.1"/></svg>
    <span className="sr-only" role="status">{busy ? 'Préparation de l’image…' : message}</span>
  </button>
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
}

function playerRow(player: SharePlayer, index: number, top: number) {
  const y = top + index * 42
  return `<rect x="78" y="${y - 29}" width="52" height="34" rx="17" fill="url(#gold)"/><text x="104" y="${y - 5}" text-anchor="middle" class="number">${player.number ?? '·'}</text><text x="150" y="${y - 6}" class="name">${escapeXml(`${player.firstName} ${player.lastName}`)}</text><text x="150" y="${y + 15}" class="role">${escapeXml(player.role || '')}</text>`
}

async function svgToPng(svg: string, width: number, height: number) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas indisponible')
    context.drawImage(image, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG indisponible')), 'image/png'))
  } finally { URL.revokeObjectURL(url) }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
