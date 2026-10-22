'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (localStorage.getItem('lions-pwa-dismissed') === '1') return
    const onInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => setVisible(false)
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    const timer = window.setTimeout(() => {
      if (!window.matchMedia('(display-mode: standalone)').matches && !('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone)) setVisible(true)
    }, 8000)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!visible) return null
  const dismiss = () => {
    localStorage.setItem('lions-pwa-dismissed', '1')
    setVisible(false)
  }
  const install = async () => {
    if (!promptEvent) {
      setHelp((value) => !value)
      return
    }
    await promptEvent.prompt()
    const result = await promptEvent.userChoice
    if (result.outcome === 'accepted') setVisible(false)
    else dismiss()
    setPromptEvent(null)
  }

  return <aside className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-lg rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl sm:bottom-5" aria-label="Installer l’application">
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-semibold text-brand">Retrouve les Lions plus vite</p><p className="mt-1 text-sm text-[var(--ink-soft)]">Ajoute l’application à l’écran d’accueil.</p></div>
      <button type="button" onClick={dismiss} aria-label="Ignorer" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-[var(--ink-soft)] hover:bg-[var(--paper)]">×</button>
    </div>
    {help && <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">Dans Safari sur iPhone ou iPad, touche Partager puis « Sur l’écran d’accueil ». Sur les autres navigateurs, ouvre le menu du navigateur et choisis l’installation si elle est proposée.</p>}
    <button type="button" onClick={install} className="mt-3 min-h-10 rounded-lg bg-maroon-panel px-4 text-sm font-bold text-on-brand">{promptEvent ? 'Installer' : help ? 'Masquer les instructions' : 'Comment installer ?'}</button>
  </aside>
}
