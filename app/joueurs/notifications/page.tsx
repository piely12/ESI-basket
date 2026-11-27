import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { requireAnyRole } from '@/lib/auth/requireUser'

type NotificationRow = { id: string; title: string; body: string; href: string | null; read_at: string | null; created_at: string }

async function markNotificationAsRead(formData: FormData) {
  'use server'
  const id = String(formData.get('notification_id') ?? '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return
  const { supabase, user } = await requireAnyRole(['joueur'])
  await supabase.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id).is('read_at', null)
  revalidatePath('/joueurs', 'layout')
}

async function markAllAsRead() {
  'use server'
  const { supabase, user } = await requireAnyRole(['joueur'])
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
  revalidatePath('/joueurs', 'layout')
}

const dateTime = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan',
}).format(new Date(value))

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams
  const requested = Number(query.page ?? '1')
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1
  const perPage = 30
  const { supabase, user } = await requireAnyRole(['joueur'])
  const { data, count, error } = await supabase.from('notifications')
    .select('id,title,body,href,read_at,created_at', { count: 'exact' })
    .eq('user_id', user.id).order('created_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1)
  if (error) return <main className="mx-auto max-w-3xl px-4 py-6"><p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm">Impossible de charger tes notifications. Actualise la page.</p></main>

  const notifications = (data ?? []) as NotificationRow[]
  const unread = notifications.filter((item) => !item.read_at).length
  const pages = Math.max(1, Math.ceil((count ?? 0) / perPage))

  return <main className="mx-auto max-w-3xl space-y-4 px-4 pt-6 sm:px-6">
    <div className="flex items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Infos équipe</p><h1 className="font-display text-3xl text-brand">Notifications</h1></div>
      {unread > 0 && <form action={markAllAsRead}><button type="submit" className="inline-flex min-h-10 items-center rounded-md border border-[var(--line)] px-3 text-xs font-bold text-brand hover:bg-[var(--paper)]">Tout marquer comme lu</button></form>}
    </div>
    {notifications.length === 0
      ? <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--ink-soft)]">Tu es à jour. Quand le coach te convoque, la notification apparaît ici.</div>
      : <ul className="space-y-2">
        {notifications.map((notification) => <li key={notification.id} className={`rounded-xl border bg-[var(--surface)] p-4 ${notification.read_at ? 'border-[var(--line)]' : 'border-[var(--gold-500)]'}`}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-[var(--ink)]">{notification.title}</h2>
            <time className="shrink-0 text-xs text-[var(--ink-soft)]" dateTime={notification.created_at}>{dateTime(notification.created_at)}</time>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{notification.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {notification.href?.startsWith('/') && !notification.href.startsWith('//') && <Link href={notification.href} className="inline-flex min-h-9 items-center text-sm font-semibold text-brand underline underline-offset-4">Ouvrir</Link>}
            {!notification.read_at && <form action={markNotificationAsRead}><input type="hidden" name="notification_id" value={notification.id} /><button type="submit" className="inline-flex min-h-9 items-center rounded-md border border-[var(--line)] px-3 text-xs font-bold text-brand hover:bg-[var(--paper)]">Marquer comme lue</button></form>}
          </div>
        </li>)}
      </ul>}
    {pages > 1 && <nav aria-label="Pages de notifications" className="flex items-center justify-between gap-3">
      {page > 1 ? <Link href={`/joueurs/notifications?page=${page - 1}`} className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-brand">Plus récentes</Link> : <span />}
      <span className="text-xs text-[var(--ink-soft)]">Page {page} sur {pages}</span>
      {page < pages ? <Link href={`/joueurs/notifications?page=${page + 1}`} className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-brand">Plus anciennes</Link> : <span />}
    </nav>}
  </main>
}
