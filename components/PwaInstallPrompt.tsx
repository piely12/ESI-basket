'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const FIRST_VISIT_KEY = 'lions-pwa-first-visit'
const OFFERED_KEY = 'lions-pwa-offer-shown'
const INSTALL_DELAY = 5 * 60 * 1000

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {})

    let firstVisit = Date.now()
    try {
      if (localStorage.getItem(OFFERED_KEY) === '1' || localStorage.getItem('lions-pwa-dismissed') === '1' || isInstalled()) return
      const storedVisit = Number(localStorage.getItem(FIRST_VISIT_KEY))
      firstVisit = storedVisit || Date.now()
      if (!storedVisit) localStorage.setItem(FIRST_VISIT_KEY, String(firstVisit))
    } catch { /* Continue for this visit if browser storage is unavailable. */ }

    const onInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      try { localStorage.setItem(OFFERED_KEY, '1') } catch { /* Ignore unavailable storage. */ }
      setVisible(false)
    }
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)

    const remaining = Math.max(0, INSTALL_DELAY - (Date.now() - firstVisit))
    const timer = window.setTimeout(() => {
      if (isInstalled()) return
      try { localStorage.setItem(OFFERED_KEY, '1') } catch { /* Ignore unavailable storage. */ }
      setVisible(true)
    }, remaining)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(OFFERED_KEY, '1')
      localStorage.setItem('lions-pwa-dismissed', '1')
    } catch { /* Ignore unavailable storage. */ }
    setVisible(false)
  }

  const install = async () => {
    if (!promptEvent) {
      setHelp((value) => !value)
      return
    }
    await promptEvent.prompt()
    await promptEvent.userChoice
    dismiss()
    setPromptEvent(null)
  }

  return (
    <aside className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-lg rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl sm:bottom-5" aria-label="Ajouter l’application à l’écran d’accueil">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-brand">Retrouve les Lions plus vite</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajoute l’application à l’écran d’accueil.</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fermer cette proposition" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-muted-foreground hover:bg-muted">×</button>
      </div>
      {help && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Sur iPhone ou iPad, dans Safari, touche Partager puis « Sur l’écran d’accueil ». Sur Android, ouvre le menu du navigateur et choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p>}
      <button type="button" onClick={() => void install()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">
        {promptEvent ? 'Installer' : help ? 'Masquer les instructions' : <>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" />
          </svg>
          Comment l’ajouter ?
        </>}
      </button>
    </aside>
  )
}
