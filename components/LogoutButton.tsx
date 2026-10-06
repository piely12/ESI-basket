'use client'

import { useState } from 'react'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      // Redirection complète : vide l'état de l'application et repasse par le proxy.
      window.location.href = '/login'
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="rounded border border-white/60 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-60"
    >
      {loading ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  )
}
