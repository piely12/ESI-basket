import { requireUser } from '@/lib/auth/requireUser'
import FirstLoginForm from './FirstLoginForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FirstLoginPage() {
  await requireUser({ allowPasswordChange: true })
  return <FirstLoginForm />
}
