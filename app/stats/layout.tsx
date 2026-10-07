import SpaceHeader from '@/components/SpaceHeader'
import { requireRole } from '@/lib/auth/requireUser'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRole('statisticienne')
  return (
    <>
      <SpaceHeader title="Espace Statisticienne" />
      {children}
    </>
  )
}
