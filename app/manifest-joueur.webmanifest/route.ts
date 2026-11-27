// Manifeste de l'app joueur : même identité visuelle, mais l'icône ouvre directement /joueurs.
export function GET() {
  return Response.json({
    id: '/joueurs',
    name: 'ESI Lions — Espace joueur',
    short_name: 'ESI Joueur',
    description: 'Convocations, notifications et statistiques des joueurs de l’ESI.',
    start_url: '/joueurs',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f0e8',
    theme_color: '#5b0f1f',
    icons: [
      { src: '/icons/esi-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/esi-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/esi-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=3600' } })
}
