'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaSettings() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setPromptEvent(null)
      setMessage('L’application est installée sur cet appareil.')
    }
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const result = await promptEvent.userChoice
    setPromptEvent(null)
    setMessage(result.outcome === 'accepted'
      ? 'L’application est installée sur cet appareil.'
      : 'Tu peux l’ajouter plus tard depuis le menu de ton navigateur.')
  }

  return (
    <section className="theme-card rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-semibold text-foreground">Ajouter à l’écran d’accueil</h2>
      <p className="mt-1 text-sm text-muted-foreground">Retrouve l’application rapidement depuis ton téléphone.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {promptEvent && <button type="button" onClick={() => void install()} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">Installer</button>}
        <button
          type="button"
          aria-expanded={instructionsOpen}
          onClick={() => {
            setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
            setInstructionsOpen((open) => !open)
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 text-brand" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" />
          </svg>
          {instructionsOpen ? 'Masquer les étapes' : 'Comment l’ajouter ?'}
        </button>
      </div>

      {instructionsOpen && (
        <p className="mt-3 rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
          {isIos
            ? 'Dans Safari, touche l’icône Partager, puis « Sur l’écran d’accueil » et Ajouter.'
            : 'Ouvre le menu de ton navigateur, puis choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ». Sur iPhone ou iPad, utilise Safari et l’icône Partager.'}
        </p>
      )}
      {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </section>
  )
}
