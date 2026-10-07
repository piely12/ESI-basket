// Cookie host-only : tous les espaces privés utilisent la même origine et
// partagent donc naturellement la session, sans cookie inter-sous-domaines.
export const cookieOptions = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}
