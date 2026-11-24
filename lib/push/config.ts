/*
 * Configuration des notifications push.
 *
 * La clé publique VAPID n'est pas un secret : elle est envoyée à chaque
 * navigateur qui s'abonne. Elle est donc aussi écrite ici, pour que
 * l'activation fonctionne même si la variable d'environnement manque sur
 * l'hébergeur. Elle doit correspondre à VAPID_PRIVATE_KEY (secrète, serveur).
 */
const COMMITTED_VAPID_PUBLIC_KEY = 'BF1lbCdsh7YSUS8zRwDFSSmkThChaRmNRVXyPda4F52GDtEPFDX4ZyI5VTN848rmxi5w9evRLOaHmbiUQZ7TDrM'

export function vapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || COMMITTED_VAPID_PUBLIC_KEY
}

/** État de la configuration, sans jamais exposer les valeurs. */
export function pushConfigStatus() {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ? 'variable' : 'intégrée au code',
    privateKey: Boolean(process.env.VAPID_PRIVATE_KEY?.trim()),
    subject: Boolean(process.env.VAPID_SUBJECT?.trim()),
    cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  }
}
