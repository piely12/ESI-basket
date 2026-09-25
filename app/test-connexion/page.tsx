import { createClient } from '@/lib/supabase/server'

export default async function TestConnexionPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('teams').select('*')

  return (
    <div style={{ padding: 24, fontFamily: 'monospace' }}>
      <h1>Test de connexion Supabase</h1>
      {error && <p style={{ color: 'red' }}>Erreur : {error.message}</p>}
      {data && (
        <>
          <p>✅ Connexion réussie — {data.length} équipe(s) trouvée(s) :</p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </div>
  )
}