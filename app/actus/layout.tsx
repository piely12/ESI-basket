import SpaceHeader from '@/components/SpaceHeader'
import { requireAnyRole } from '@/lib/auth/requireUser'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(['videaste', 'admin'])
  return (
    <>
      <SpaceHeader title="Espace Actualités" />
      {children}
    </>
  )
}
