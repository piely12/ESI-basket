'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'

type VitalEvent = { type: 'vital'; url: string; route?: string }

// Keep only aggregate performance data: discard page paths, query strings,
// and dynamic route names before an event leaves the browser.
function anonymizeVital(event: VitalEvent): VitalEvent {
  return { type: event.type, url: `${window.location.origin}/`, route: '/' }
}

export default function SiteSpeedInsights() {
  return <SpeedInsights beforeSend={anonymizeVital} />
}
