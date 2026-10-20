import AccountSection from '../AccountSection'
import { getAdminAccountData } from '../data'

export default async function AdminStaffPage() {
  const { staff } = await getAdminAccountData()
  const profiles = staff.filter((profile) => ['coach', 'coach_adjoint', 'statisticienne', 'admin'].includes(profile.role))
  const targets = profiles.filter((profile) => profile.role !== 'admin')
  const needsCoachProfile = !profiles.some((profile) => profile.role === 'coach')
  return <AccountSection
    title="Staff"
    description=""
    profiles={profiles}
    targets={targets}
    needsCoachProfile={needsCoachProfile}
    canCreateAssistantProfile
  />
}
