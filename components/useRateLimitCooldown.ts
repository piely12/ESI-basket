'use client'

import { useCallback, useEffect, useState } from 'react'

export function useRateLimitCooldown(): [number, (retryAfterSeconds: number) => void] {
  const [expiresAt, setExpiresAt] = useState(0)
  const [clockNow, setClockNow] = useState(0)

  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setInterval(() => {
      const now = Date.now()
      setClockNow(now)
      if (now >= expiresAt) setExpiresAt(0)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  const startCooldown = useCallback((retryAfterSeconds: number) => {
    if (retryAfterSeconds <= 0) return
    const now = Date.now()
    setClockNow(now)
    setExpiresAt(now + Math.ceil(retryAfterSeconds) * 1000)
  }, [])
  const seconds = expiresAt ? Math.max(0, Math.ceil((expiresAt - clockNow) / 1000)) : 0
  return [seconds, startCooldown]
}
