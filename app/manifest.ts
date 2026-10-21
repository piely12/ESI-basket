import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Inter-Écoles Basketball · The Lions of ESI',
    short_name: 'Lions ESI',
    description: 'Résultats, calendrier et actualités des Lions de l’ESI.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: 'oklch(0.9664 0.0096 72.7)',
    theme_color: 'oklch(0.3514 0.1269 16.8)',
    icons: [
      { src: '/icons/esi-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/esi-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/esi-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
