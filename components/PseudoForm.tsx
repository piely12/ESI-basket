'use client'

import { useActionState } from 'react'
import { updatePseudo, type PseudoState } from '@/app/joueurs/profil/actions'
import { PSEUDO_MAX } from '@/lib/validation'

export default function PseudoForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<PseudoState, FormData>(updatePseudo, {})
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="pseudo" className="text-sm font-medium">Pseudo affiché</label>
      <div className="flex gap-2">
        <input id="pseudo" name="pseudo" defaultValue={current} maxLength={PSEUDO_MAX} autoCapitalize="none" spellCheck={false}
          autoComplete="nickname" required className="min-w-0 flex-1 rounded border p-2" aria-describedby="pseudo-msg" />
        <button disabled={pending} className="rounded bg-maroon-panel px-4 text-on-brand disabled:opacity-60">{pending ? '…' : 'Enregistrer'}</button>
      </div>
      <p id="pseudo-msg" role="status" aria-live="polite" className={`min-h-5 text-sm ${state.error ? 'text-danger' : 'text-success'}`}>
        {state.error ?? (state.ok ? 'Pseudo enregistré.' : '')}
      </p>
    </form>
  )
}
