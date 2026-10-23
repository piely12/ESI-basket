export const RATE_LIMITS = Object.freeze({
  login: { limit: 8, windowSeconds: 15 * 60, message: 'Trop de tentatives de connexion. Réessaie dans quelques minutes.' },
  contact: { limit: 3, windowSeconds: 60 * 60, message: 'Tu as atteint la limite de messages. Réessaie dans une heure.' },
  invitation: { limit: 20, windowSeconds: 60, message: 'Trop d’invitations en une minute. Réessaie dans quelques instants.' },
  sensitiveMutation: { limit: 30, windowSeconds: 60, message: 'Trop de modifications en une minute. Réessaie dans quelques instants.' },
  publicApiRead: { limit: 300, windowSeconds: 60, message: 'Trop de requêtes. Réessaie dans quelques instants.' },
})
