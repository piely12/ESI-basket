import AccountSection from '../AccountSection'
import { getAdminAccountData } from '../data'

export default async function AdminPlayersPage() {
  const { players } = await getAdminAccountData()
  return <AccountSection
    title="Joueurs"
    description="Chaque compte est associé par l’administration au profil sportif correspondant."
    profiles={players}
    targets={players}
  />
}
