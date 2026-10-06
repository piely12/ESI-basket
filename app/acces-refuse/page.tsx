import LogoutButton from '@/components/LogoutButton'

export default function AccesRefuse() {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-2xl font-bold">Accès refusé</h1>
      <p className="mt-2 text-neutral-600">
        Votre compte n&apos;a pas accès à cet espace. Déconnectez-vous et reconnectez-vous avec le bon compte.
      </p>
      <div className="mt-6 inline-block rounded bg-[#7a1f2b]">
        <LogoutButton />
      </div>
    </main>
  )
}
