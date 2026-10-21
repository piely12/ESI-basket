'use client'

import { useState, useSyncExternalStore } from 'react'
import PublicNav from '@/components/PublicNav'

const faq = [
  ['Quand les résultats sont-ils publiés ?', 'Au plus tard 48 h après chaque match.'],
  ['Pourquoi la composition affiche-t-elle N/A ?', 'Elle n’est dévoilée qu’à partir du jour du match.'],
  ['Comment rejoindre l’équipe ?', 'Contactez le staff de l’ESI Basketball.'],
]

type ThemeMode = 'light' | 'dark'

function readThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Fall back to the operating system preference when storage is unavailable.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  window.dispatchEvent(new Event('lions-theme-change'))
}

function subscribeToTheme(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = () => {
    try {
      if (!localStorage.getItem('theme')) onChange()
    } catch {
      onChange()
    }
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'theme') onChange()
  }
  media.addEventListener('change', onSystemChange)
  window.addEventListener('storage', onStorage)
  window.addEventListener('lions-theme-change', onChange)
  return () => {
    media.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('lions-theme-change', onChange)
  }
}

function getThemeSnapshot(): ThemeMode {
  return readThemeMode()
}

export default function ReglagesPage() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => 'light')
  const [pseudo, setPseudo] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)

  function changeTheme(mode: ThemeMode) {
    try {
      localStorage.setItem('theme', mode)
    } catch { /* Apply the mode in this tab if storage is unavailable. */ }
    applyTheme(mode)
  }

  async function submitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    if (pseudo.trim().length < 2 || message.trim().length < 5) {
      setFeedback('Entrez un pseudonyme (2 caractères minimum) et un message (5 caractères minimum).')
      return
    }
    setSending(true)
    setFeedback('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pseudo: pseudo.trim(), message: message.trim() }),
      })
      const result = await response.json() as { ok?: boolean; error?: string }
      if (response.ok && result.ok) {
        setPseudo('')
        setMessage('')
        setFeedback('Message envoyé. Ton pseudonyme ne sera visible que par l’administration.')
      } else if (response.status === 429) {
        setFeedback('Trop de messages ont été envoyés récemment. Réessaie plus tard.')
      } else {
        setFeedback('Le message n’a pas pu être envoyé. Réessaie plus tard.')
      }
    } catch {
      setFeedback('Connexion indisponible. Réessaie plus tard.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 pb-28 pt-8 sm:px-5">
        <header className="mb-5">
          <h1 className="font-display text-5xl leading-none text-brand sm:text-6xl">Réglages</h1>
        </header>
        <fieldset className="theme-card rounded-lg dark:rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <legend className="px-1 font-semibold">Apparence</legend>
          <div className="flex gap-2" role="group" aria-label="Choisir le thème">
            {([['light', 'Clair'], ['dark', 'Sombre']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={theme === value} onClick={() => changeTheme(value)} className={`min-h-11 rounded-xl border px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${theme === value ? 'border-brand bg-brand text-primary-foreground dark:border-gold dark:bg-gold dark:text-gold-foreground' : 'border-border bg-card text-foreground hover:bg-muted'}`}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <section className="theme-card rounded-lg dark:rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-display text-2xl text-brand">FAQ</h2>
          {faq.map(([question, answer]) => <details key={question} className="border-t border-[var(--line)] py-2"><summary className="cursor-pointer font-semibold">{question}</summary><p className="pt-1 text-sm text-[var(--ink-soft)]">{answer}</p></details>)}
        </section>
        <section className="theme-card rounded-lg dark:rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-display text-2xl text-brand">Confidentialité</h2>
          <p className="text-sm text-[var(--ink-soft)]">Les données des joueurs sont réservées aux membres autorisés de l’équipe et ne sont utilisées que pour le suivi sportif.</p>
        </section>
        <section className="theme-card rounded-lg dark:rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-display text-2xl text-brand">Contact</h2>
          <form className="space-y-2" onSubmit={submitContact}>
            <input value={pseudo} onChange={(event) => setPseudo(event.target.value)} maxLength={40} placeholder="Pseudonyme" aria-label="Pseudonyme" className="w-full rounded border border-[var(--line)] bg-transparent px-3 py-2" />
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={4} placeholder="Votre message" aria-label="Votre message" className="w-full rounded border border-[var(--line)] bg-transparent px-3 py-2" />
            <button disabled={sending} className="rounded bg-maroon-panel px-4 py-2 font-semibold text-on-brand disabled:opacity-60">{sending ? 'Envoi…' : 'Envoyer'}</button>
            {feedback && <p role="status" className="text-sm text-[var(--ink-soft)]">{feedback}</p>}
          </form>
        </section>
      </main>
    </>
  )
}
