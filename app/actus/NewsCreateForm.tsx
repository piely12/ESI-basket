'use client'

import { useActionState, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createNewsArticle, type EditorialState } from './actions'

const INITIAL: EditorialState = { error: '', success: '' }
const fieldClass = 'min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus-visible:border-[var(--gold-deep)] focus-visible:ring-2 focus-visible:ring-[var(--gold-500)]/30'
const labelClass = 'grid gap-1.5 text-sm font-semibold text-[var(--ink)]'
const allowedTypes: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm',
}
const MAX_BYTES = 20 * 1024 * 1024

export default function NewsCreateForm() {
  const [state, formAction, pending] = useActionState(createNewsArticle, INITIAL)
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploading, setUploading] = useState(false)

  async function uploadMedia(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    const extension = allowedTypes[file.type]
    if (!extension || file.size > MAX_BYTES) {
      setUploadMessage('Formats acceptés : JPG, PNG, WebP, MP4 ou WebM (20 Mo maximum).')
      event.currentTarget.value = ''
      return
    }

    setUploading(true)
    setUploadMessage('Envoi du média…')
    try {
      const client = createClient()
      const { data: { user }, error: userError } = await client.auth.getUser()
      if (userError || !user) throw new Error('Session expirée. Reconnecte-toi puis réessaie.')
      const objectPath = `${user.id}/${crypto.randomUUID()}.${extension}`
      const { error } = await client.storage.from('news-media').upload(objectPath, file, {
        contentType: file.type, cacheControl: '31536000', upsert: false,
      })
      if (error) throw new Error('Le média n’a pas pu être envoyé. Réessaie.')
      const { data } = client.storage.from('news-media').getPublicUrl(objectPath)
      setMediaUrl(data.publicUrl)
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image')
      setUploadMessage('Média envoyé. Enregistre le brouillon pour l’associer à l’article.')
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Échec de l’envoi du média.')
    } finally {
      setUploading(false)
    }
  }

  return <form action={formAction} className="grid gap-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>Titre de l’actualité
        <input className={fieldClass} name="title" required minLength={5} maxLength={120} placeholder="Ex. Les Lions signent une victoire importante" />
      </label>
      <label className={labelClass}>Rubrique
        <select className={fieldClass} name="category" defaultValue="equipe">
          <option value="equipe">Vie de l’équipe</option><option value="match">Après-match</option>
          <option value="annonce">Annonce</option><option value="portrait">Portrait</option>
        </select>
      </label>
    </div>
    <label className={labelClass}>Chapô <span className="font-normal text-[var(--ink-soft)]">Une phrase pour présenter l’article.</span>
      <textarea className={fieldClass} name="excerpt" rows={2} maxLength={220} placeholder="Le résumé qui apparaîtra dans la liste des actualités." />
    </label>
    <label className={labelClass}>Texte de l’article
      <textarea className={fieldClass} name="body" required minLength={30} maxLength={20000} rows={7} placeholder="Raconte l’information avec des phrases courtes." />
    </label>
    <div className="grid gap-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className={labelClass}>Photo ou vidéo
        <input className={fieldClass} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => void uploadMedia(event)} disabled={uploading} />
        <span className="text-xs font-normal text-[var(--ink-soft)]">JPG, PNG, WebP, MP4 ou WebM · 20 Mo maximum</span>
      </label>
      <span className="text-xs font-semibold text-[var(--ink-soft)]">{uploading ? 'Envoi…' : mediaUrl ? 'Média prêt' : 'Média facultatif'}</span>
      <input type="hidden" name="media_url" value={mediaUrl} />
      <input type="hidden" name="media_type" value={mediaType} />
      <input type="hidden" name="cover_url" value={mediaType === 'image' ? mediaUrl : ''} />
      {uploadMessage && <p className="text-xs text-[var(--ink-soft)] sm:col-span-2" role="status" aria-live="polite">{uploadMessage}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending || uploading} className="min-h-11 rounded-lg bg-[var(--maroon-900)] px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-500)]">
        {pending ? 'Enregistrement…' : 'Enregistrer le brouillon'}
      </button>
      <p className="text-xs text-[var(--ink-soft)]">Le texte reste en brouillon jusqu’à ta publication.</p>
    </div>
    <p role={state.error ? 'alert' : 'status'} aria-live="polite" className={`min-h-5 text-sm ${state.error ? 'text-red-700' : 'text-[var(--maroon-900)]'}`}>{state.error || state.success}</p>
  </form>
}
