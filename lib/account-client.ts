'use client'

import { useEffect, useState } from 'react'

export type Convocation = {
  matchId: string
  scheduledAt: string
  kickoffConfirmed: boolean
  location: string | null
  opponent: string | null
}

export type Account =
  | { authenticated: false }
  | {
    authenticated: true
    role: 'joueur' | 'coach' | 'coach_adjoint' | 'statisticienne' | 'admin'
    firstName: string
    lastName: string
    nickname: string | null
    convocation: Convocation | null
  }

let pending: Promise<Account> | null = null

/** Signed-in account of this visit (one request shared by every component). */
export function loadAccount(refresh = false): Promise<Account> {
  if (!pending || refresh) {
    pending = fetch('/api/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() as Promise<Account> : { authenticated: false as const }))
      .catch(() => ({ authenticated: false as const }))
  }
  return pending
}

/** `undefined` while loading. */
export function useAccount() {
  const [account, setAccount] = useState<Account | undefined>(undefined)
  useEffect(() => {
    let active = true
    void loadAccount().then((value) => { if (active) setAccount(value) })
    return () => { active = false }
  }, [])
  return [account, setAccount] as const
}

/** « KOUAO CHRIS-IVANN » → « Kouao Chris-Ivann ». */
export function displayName(value: string) {
  return value.toLocaleLowerCase('fr-FR').replace(/(^|[\s'’-])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase('fr-FR'))
}

export function greetingName(account: Extract<Account, { authenticated: true }>) {
  return account.nickname || displayName(`${account.firstName} ${account.lastName}`.trim())
}

export const ROLE_LABELS: Record<string, string> = {
  joueur: 'Joueur',
  coach: 'Coach principal',
  coach_adjoint: 'Coach adjoint',
  statisticienne: 'Statisticienne',
  admin: 'Administrateur',
}
