'use client'

import { useActionState } from 'react'
import { updateNewsArticle, type EditorialState } from './actions'

const INITIAL: EditorialState = { error: '', success: '' }
const fieldClass = 'min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus-visible:border-[var(--gold-deep)] focus-visible:ring-2 focus-visible:ring-[var(--gold-500)]/30'

export default function NewsEditForm({ article }: {
  article: { id: string; title: string; excerpt: string | null; body: string; category: string | null; cover_url: string | null }
}) {
  const [state, formAction, pending] = useActionState(updateNewsArticle, INITIAL)
  return <details className="mt-4 border-t border-[var(--line)] pt-3">
    <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-[var(--maroon-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-deep)]">Modifier l’article</summary>
    <form action={formAction} className="mt-3 grid gap-3">
      <input type="hidden" name="id" value={article.id} />
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">Titre<input name="title" required minLength={5} maxLength={120} defaultValue={article.title} className={fieldClass} /></label>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">Rubrique<input name="category" maxLength={40} defaultValue={article.category ?? ''} className={fieldClass} /></label>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">Chapô<textarea name="excerpt" maxLength={220} rows={2} defaultValue={article.excerpt ?? ''} className={fieldClass} /></label>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">Texte<textarea name="body" required minLength={30} maxLength={20000} rows={6} defaultValue={article.body} className={fieldClass} /></label>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">Lien de la photo de couverture<input name="cover_url" type="url" defaultValue={article.cover_url ?? ''} className={fieldClass} /></label>
      <button type="submit" disabled={pending} className="min-h-11 w-fit rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--maroon-900)] hover:bg-[var(--paper)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-deep)]">{pending ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
      <p role={state.error ? 'alert' : 'status'} aria-live="polite" className={`text-sm ${state.error ? 'text-red-700' : 'text-[var(--maroon-900)]'}`}>{state.error || state.success}</p>
    </form>
  </details>
}
