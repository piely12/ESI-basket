import SpaceHeader from '@/components/SpaceHeader'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SpaceHeader title="Espace Coach" />
      {children}
    </>
  )
}
