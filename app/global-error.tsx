'use client'

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#faf6f1', color: '#25050d', fontFamily: 'Arial, sans-serif' }}>
        <main style={{ maxWidth: 480, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>The Lions of ESI</p>
          <h1>Un problème est survenu</h1>
          <p>La page n’a pas pu être chargée. Réessaie dans un instant.</p>
          <button type="button" onClick={retry} style={{ minHeight: 44, padding: '8px 20px', border: 0, borderRadius: 8, background: '#6e0f22', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Réessayer</button>
        </main>
      </body>
    </html>
  )
}
