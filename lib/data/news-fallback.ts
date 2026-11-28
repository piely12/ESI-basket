import type { PublishedNews } from '@/lib/data/public'

export const fallbackNews: PublishedNews[] = [
  {
    id: 'premiere-victoire-saison',
    category: 'Match',
    title: 'Première victoire de la saison face à l’ESTP !',
    excerpt: 'Menés 14-3 en début de match, les Lions ont su réagir et décrocher leur première victoire de la saison 48–32.',
    body: [
      'Les Lions de l’ESI lancent leur saison de la meilleure des manières avec une première victoire face à l’ESTP !',
      'Un succès obtenu au terme d’un match disputé, marqué par une entame particulièrement difficile. Menés **14-3** dès les premières minutes, nos joueurs ont su faire preuve de caractère, retrouver leurs repères et afficher de meilleures intentions pour inverser progressivement la dynamique de la rencontre.',
      'Cette victoire témoigne de la combativité et de la capacité de réaction du groupe. Toutefois, certains aspects restent à améliorer, notamment **l’adresse à trois points**, qui constituera un axe de travail important pour la suite de la saison.',
      '**Un premier succès, mais le travail continue. Prochain objectif : confirmer !**',
      '🦁 **THE LIONS OF ESI – WE PLAY TO WIN.**',
    ].join('\n\n'),
    cover_url: null,
    published_at: null,
  },
  {
    id: 'mvp-amon-loic',
    category: 'MVP',
    title: 'MVP du match : AMON Loïc, super sub !',
    excerpt: '14 points et 3 passes décisives face à l’ESTP, sorti du banc.',
    body: [
      '**SUPER SUB !**',
      'Sorti du banc, Amon Loïc a été un véritable déclencheur offensif pour les Lions. Grâce à sa qualité de tir à mi-distance et à sa capacité à apporter de l’énergie en attaque, il a su faire basculer la dynamique du match et contribuer de manière significative à cette première victoire.',
      'Une entrée remarquée et une prestation qui mérite d’être saluée !',
    ].join('\n\n'),
    cover_url: null,
    published_at: null,
  },
  {
    id: 'home-news-next',
    category: 'Prochain match',
    title: 'E. Projet – ESI, samedi 28 novembre',
    excerpt: 'Coup d’envoi à 19h au Gymnase du Sud.',
    body: '',
    cover_url: null,
    published_at: null,
  },
]

export function withNewsFallback(news: PublishedNews[]) {
  return news.length ? news : fallbackNews
}
