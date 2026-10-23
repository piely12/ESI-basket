'use client'

import { useState, useSyncExternalStore } from 'react'
import PublicNav from '@/components/PublicNav'
import PageTitle from '@/components/PageTitle'
import MatchNotificationsSetting from '@/components/MatchNotificationsSetting'
import PwaSettings from '@/components/PwaSettings'

type ThemeMode = 'light' | 'dark'

function readThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Use the light theme if storage is unavailable. */ }
  return 'light'
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  window.dispatchEvent(new Event('lions-theme-change'))
}

function subscribeToTheme(onChange: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === 'theme') onChange() }
  window.addEventListener('storage', onStorage)
  window.addEventListener('lions-theme-change', onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('lions-theme-change', onChange)
  }
}

export default function ReglagesPage() {
  const theme = useSyncExternalStore(subscribeToTheme, readThemeMode, () => 'light')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)

  function changeTheme(mode: ThemeMode) {
    try { localStorage.setItem('theme', mode) } catch { /* Apply the mode in this tab. */ }
    applyTheme(mode)
  }

  async function submitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    if (message.trim().length < 5) {
      setFeedback('Le message doit contenir au moins 5 caractères.')
      return
    }
    setSending(true)
    setFeedback('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), website: new FormData(event.currentTarget).get('website') }),
      })
      const result = await response.json() as { ok?: boolean }
      if (response.ok && result.ok) {
        setMessage('')
        setFeedback('Message envoyé anonymement.')
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

  return <>
    <PublicNav />
    <main className="reference-page-shell page-title-page mx-auto max-w-5xl space-y-4 px-4 pb-28 pt-8 sm:px-5">
      <PageTitle title="Réglages" subtitle="Personnalisez votre expérience" />

      <section className="settings-card theme-card flex items-center gap-3.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4" aria-label="Mode sombre">
        <div className="min-w-0 flex-1">
          <h2 className="settings-card-title">Mode sombre</h2>
          <p className="settings-card-description mt-1">Activer le thème sombre pour un meilleur confort visuel.</p>
        </div>
        <button type="button" role="switch" aria-label="Mode sombre" aria-checked={theme === 'dark'} onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')} className="settings-toggle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" data-checked={theme === 'dark'} />
      </section>

      <MatchNotificationsSetting />
      <PwaSettings />

      <details className="settings-card theme-card group rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <summary className="cursor-pointer list-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span className="settings-card-title block">Conditions générales d’utilisation</span>
          <span className="settings-card-description mt-1 block">Application : The Lions of ESI Basketball · Mise à jour : 10 novembre 2026</span>
        </summary>
        <div className="settings-card-description mt-4 space-y-4 border-t border-settings-divider pt-4">
          <section><h3 className="mb-1 font-bold text-foreground">1. Objet</h3><p>L’application The Lions of ESI Basketball permet de consulter les matchs, résultats, classements, statistiques, compositions et actualités de l’équipe de basketball de l’École Supérieure d’Industrie (ESI), qui participe aux Inter-Écoles de l’INP-HB. Elle est éditée par l’équipe de l’ESI Basketball Homme, en Côte d’Ivoire. En l’utilisant, vous acceptez les présentes conditions.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">2. Règles d’utilisation</h3><p>Vous vous engagez à respecter les lois ivoiriennes, à ne publier aucun contenu injurieux, diffamatoire, menaçant, haineux ou mensonger, et à ne pas perturber le service (intrusion, extraction automatisée ou usurpation d’identité). Ces actes peuvent constituer des infractions au titre du Code pénal et de la loi n° 2013-451 du 19 juin 2013 relative à la lutte contre la cybercriminalité. L’éditeur peut supprimer un contenu et suspendre l’accès en cas de manquement.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">3. Informations sportives</h3><p>Les informations sportives proviennent de la table des scores des Inter-Écoles et sont fournies à titre informatif. Elles peuvent être corrigées ; les classements restent provisoires tant que la saison régulière n’est pas terminée. En cas de divergence, la décision officielle des Inter-Écoles prévaut.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">4. Données personnelles</h3><p>Le traitement de vos données est décrit dans la Politique de confidentialité, conformément à la loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">5. Propriété intellectuelle</h3><p>L’application, son code, ses visuels et le logo « The Lions of ESI » sont protégés par la loi n° 2016-555 du 26 juillet 2016 relative au droit d’auteur et aux droits voisins. Les logos des écoles et des Inter-Écoles appartiennent à leurs titulaires. Toute reproduction sans autorisation écrite est interdite, sauf usage personnel non commercial.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">6. Responsabilité et disponibilité</h3><p>L’application peut évoluer ou être temporairement indisponible. L’éditeur ne garantit pas l’absence d’erreurs ou d’interruptions et n’est pas responsable des dommages liés à une indisponibilité, à une erreur dans des informations fournies par des tiers ou à une utilisation contraire aux présentes conditions, sauf faute lourde ou intentionnelle.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">7. Modification et droit applicable</h3><p>Les présentes conditions peuvent être modifiées à tout moment ; la version en vigueur est celle publiée dans l’application. Elles sont soumises au droit ivoirien. À défaut d’accord amiable, les juridictions ivoiriennes compétentes, notamment celles d’Abidjan, sont saisies.</p></section>
          <p className="border-t border-settings-divider pt-3">Contact : <a className="font-semibold text-brand underline" href="mailto:saihuriel118@gmail.com">saihuriel118@gmail.com</a></p>
        </div>
      </details>

      <details className="settings-card theme-card group rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <summary className="cursor-pointer list-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span className="settings-card-title block">Politique de confidentialité</span>
          <span className="settings-card-description mt-1 block">Application : The Lions of ESI Basketball · Mise à jour : 22 octobre 2026</span>
        </summary>
        <div className="settings-card-description mt-4 space-y-4 border-t border-settings-divider pt-4">
          <p>Cette politique explique comment l’application collecte, utilise et protège vos données personnelles, conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel.</p>
          <section><h3 className="mb-1 font-bold text-foreground">1. Responsable du traitement</h3><p>Le responsable du traitement est l’équipe de l’ESI Basketball Homme, joignable à <a className="font-semibold text-brand underline" href="mailto:saihuriel118@gmail.com">saihuriel118@gmail.com</a>.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">2. Données collectées</h3><ul className="list-inside list-disc space-y-1">
            <li><strong>Joueurs :</strong> nom, numéro, poste, photo et statistiques sportives, pour présenter l’équipe et suivre ses performances.</li>
            <li><strong>Comptes autorisés :</strong> informations nécessaires à l’authentification et à la gestion des accès.</li>
            <li><strong>Messages anonymes :</strong> contenu et date d’envoi ; aucun nom, e-mail ou compte n’est associé au message. Une clé technique dérivée de l’adresse IP est traitée séparément pendant la période anti-abus, puis supprimée.</li>
            <li><strong>Notifications :</strong> identifiant technique de l’abonnement du navigateur et clés de chiffrement, nécessaires à l’envoi des alertes. Ils sont supprimés lorsque l’abonnement est retiré ou devient invalide.</li>
            <li><strong>Préférences :</strong> thème clair ou sombre, enregistré sur votre appareil.</li>
          </ul></section>
          <section><h3 className="mb-1 font-bold text-foreground">3. Conservation</h3><p>Les messages anonymes sont automatiquement supprimés au plus tard 12 mois après leur envoi, sauf obligation légale contraire. Les préférences de thème restent sur votre appareil jusqu’à leur suppression. Les autres données sont conservées le temps nécessaire à leur finalité.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">4. Accès et hébergement</h3><p>Les données sont accessibles uniquement aux personnes autorisées, selon leurs fonctions. Elles ne sont ni vendues ni utilisées à des fins commerciales. L’application peut utiliser des prestataires techniques pour son hébergement et son fonctionnement ; certains traitements peuvent avoir lieu hors de Côte d’Ivoire.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">5. Vos droits</h3><p>Conformément à la réglementation applicable, vous pouvez demander l’accès à vos données, leur rectification ou leur suppression, et exercer les autres droits prévus par la loi en écrivant à <a className="font-semibold text-brand underline" href="mailto:saihuriel118@gmail.com">saihuriel118@gmail.com</a>. Vous pouvez également saisir l’ARTCI, autorité ivoirienne compétente en matière de protection des données personnelles.</p></section>
          <section><h3 className="mb-1 font-bold text-foreground">6. Sécurité et modifications</h3><p>Des mesures raisonnables sont prises pour protéger les données contre les accès non autorisés, la perte ou la divulgation. Aucun système ne garantit toutefois une sécurité absolue. Cette politique peut évoluer avec l’application ou la réglementation ; sa date de mise à jour figure en tête de cette section.</p></section>
        </div>
      </details>

      <section className="settings-card theme-card rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="mb-3">
          <h2 className="settings-card-title">Messages anonymes</h2>
          <p className="settings-card-description mt-1">Écris-nous sans nom ni pseudonyme : aucune identité n’est enregistrée avec le message.</p>
        </div>
        <form className="space-y-3" onSubmit={submitContact}>
          <label aria-hidden="true" className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden" tabIndex={-1}>
            Ne pas remplir ce champ
            <input name="website" type="text" autoComplete="off" tabIndex={-1} />
          </label>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={4} placeholder="Votre message" aria-label="Votre message" className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground" />
          <button disabled={sending} className="min-h-11 rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{sending ? 'Envoi…' : 'Envoyer'}</button>
          {feedback && <p role="status" className="text-sm text-muted-foreground">{feedback}</p>}
        </form>
      </section>

      <section className="settings-card theme-card rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="settings-card-title">Contact</h2>
        <p className="settings-card-description mt-1">Une question ? Écris-nous sur WhatsApp.</p>
        <a href="https://wa.me/message/HU77PSLHFNKOC1" target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Contacter sur WhatsApp</a>
      </section>
    </main>
  </>
}
