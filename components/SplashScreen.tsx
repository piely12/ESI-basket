'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (root.dataset.splashSeen === 'true') return
    try { window.sessionStorage.setItem('lions-splash-seen', '1') } catch { /* Storage may be disabled. */ }
    const startedAt = Date.now()
    const minTimer = window.setTimeout(() => setLeaving(true), Math.max(0, 1200 - (Date.now() - startedAt)))
    const maxTimer = window.setTimeout(() => setLeaving(true), 4000)
    const hideTimer = window.setTimeout(() => {
      root.dataset.splashSeen = 'true'
      delete root.dataset.splashEnabled
    }, 4450)
    return () => {
      window.clearTimeout(minTimer)
      window.clearTimeout(maxTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  return <div className="lions-splash" data-leaving={leaving || undefined} role="status" aria-label="Chargement de The Lions of ESI">
    <div className="lions-splash__content">
      <div className="relative w-full">
        <Image src="/logos/esi.png" alt="The Lions of ESI" width={512} height={512} priority className="lions-splash__logo" />
        <span className="lions-splash__shine" aria-hidden="true" />
      </div>
      <span className="lions-splash__progress" aria-hidden="true" />
    </div>
  </div>
}
