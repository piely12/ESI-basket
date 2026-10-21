import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/requireUser'
import { createAdminClient } from '@/lib/supabase/admin'

const MessageAction = z.object({ id: z.string().uuid(), status: z.enum(['lu', 'traite']) }).strict()

async function updateMessageStatus(formData: FormData) {
  'use server'
  const { user } = await requireRole('admin')
  const parsed = MessageAction.safeParse({ id: formData.get('id'), status: formData.get('status') })
  if (!parsed.success) return
  const admin = createAdminClient()
  const { error } = await admin.from('contact_messages').update({ status: parsed.data.status }).eq('id', parsed.data.id)
  if (error) throw new Error('Impossible de mettre à jour ce message.')
  await admin.from('audit_logs').insert({
    actor_user_id: user.id,
    action: parsed.data.status === 'traite' ? 'contact_message_resolved' : 'contact_message_marked_read',
    entity_type: 'contact_message',
    entity_id: parsed.data.id,
    metadata: {},
  })
  revalidatePath('/admin/messages')
}

export default async function AdminMessagesPage() {
  await requireRole('admin')
  const admin = createAdminClient()
  const { data: messages, error } = await admin.from('contact_messages')
    .select('id,pseudo,message,status,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error('Impossible de charger les messages.')

  return <main className="mx-auto max-w-5xl space-y-6 px-4 pb-28 pt-8 sm:px-6">
    <header className="rounded-2xl bg-maroon-panel p-6 text-on-brand sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-500)]">Espace administrateur</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Messages anonymes</h1>
      <p className="mt-3 text-sm text-on-brand/80">Le pseudonyme est visible uniquement ici. Les adresses IP ne sont pas enregistrées avec les messages.</p>
    </header>
    <section className="space-y-3" aria-label="Messages reçus">
      {(messages ?? []).map((item) => <article key={item.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-semibold text-brand">{item.pseudo}</p>
            <time className="text-xs text-[var(--ink-soft)]" dateTime={item.created_at}>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Abidjan' }).format(new Date(item.created_at))}</time></div>
          <span className="rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">{item.status}</span>
        </header>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm text-[var(--ink)]">{item.message}</p>
        {item.status !== 'traite' && <div className="mt-4 flex flex-wrap gap-2">
          {item.status === 'nouveau' && <form action={updateMessageStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="lu" /><button className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold">Marquer comme lu</button></form>}
          <form action={updateMessageStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="traite" /><button className="min-h-10 rounded-lg bg-maroon-panel px-3 text-sm font-semibold text-on-brand">Marquer comme traité</button></form>
        </div>}
      </article>)}
      {!messages?.length && <p className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--ink-soft)]">Aucun message reçu.</p>}
    </section>
  </main>
}
