'use client'

import { useEffect, useState } from 'react'
import PublicNav from '@/components/PublicNav'

const faq = [
  ['Quand les résultats sont-ils publiés ?', 'Au plus tard 48 h après chaque match.'],
  ['Pourquoi la composition affiche-t-elle N/A ?', 'Elle n’est dévoilée qu’à partir du jour du match.'],
  ['Comment rejoindre l’équipe ?', 'Contactez le staff de l’ESI Basketball.'],
]

export default function ReglagesPage() {
  const [dark, setDark] = useState(false)
  const [pseudo, setPseudo] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])

  function toggleTheme() {
    document.documentElement.classList.toggle('dark')
    setDark(document.documentElement.classList.contains('dark'))
  }

  function submitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pseudo.trim().length < 2 || message.trim().length < 5) {
      setFeedback('Entrez un pseudonyme (2 caractères minimum) et un message (5 caractères minimum).')
      return
    }
    setFeedback('Le formulaire de contact sera relié prochainement.')
  }

  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 pb-28 pt-8 sm:px-5">
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold-deep)]">Préférences</p>
          <h1 className="font-display text-5xl leading-none text-[var(--maroon-900)] sm:text-6xl">Réglages</h1>
        </header>
        <section className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
          <span className="font-semibold">Mode sombre</span>
          <button type="button" role="switch" aria-checked={dark} aria-label="Activer le mode sombre" onClick={toggleTheme} className={`h-7 w-12 rounded-full p-1 transition ${dark ? 'bg-[var(--gold-500)]' : 'bg-[var(--line)]'}`}>
            <span className={`block h-5 w-5 rounded-full bg-[var(--maroon-900)] transition ${dark ? 'translate-x-5' : ''}`} />
          </button>
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-display text-2xl text-[var(--maroon-900)]">FAQ</h2>
          {faq.map(([question, answer]) => <details key={question} className="border-t border-[var(--line)] py-2"><summary className="cursor-pointer font-semibold">{question}</summary><p className="pt-1 text-sm text-[var(--ink-soft)]">{answer}</p></details>)}
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-display text-2xl text-[var(--maroon-900)]">Confidentialité</h2>
          <p className="text-sm text-[var(--ink-soft)]">Les données des joueurs sont réservées aux membres autorisés de l’équipe et ne sont utilisées que pour le suivi sportif.</p>
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-display text-2xl text-[var(--maroon-900)]">Contact</h2>
          <form className="space-y-2" onSubmit={submitContact}>
            <input value={pseudo} onChange={(event) => setPseudo(event.target.value)} maxLength={40} placeholder="Pseudonyme" aria-label="Pseudonyme" className="w-full rounded border border-[var(--line)] bg-transparent px-3 py-2" />
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={4} placeholder="Votre message" aria-label="Votre message" className="w-full rounded border border-[var(--line)] bg-transparent px-3 py-2" />
            <button className="rounded bg-[var(--maroon-900)] px-4 py-2 font-semibold text-white">Envoyer</button>
            {feedback && <p role="status" className="text-sm text-[var(--ink-soft)]">{feedback}</p>}
          </form>
        </section>
      </main>
    </>
  )
}
