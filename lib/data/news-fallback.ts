import type { PublishedNews } from '@/lib/data/public'

export const fallbackNews: PublishedNews[] = [
  {
    id: 'home-news-match',
    category: 'Match',
    title: 'Victoire de caractère à l’extérieur face à l’ESTP',
    excerpt: 'Les Lions s’imposent 64–61 au terme d’un money-time maîtrisé.',
    body: '',
    cover_url: null,
    published_at: null,
  },
  {
    id: 'home-news-mvp',
    category: 'MVP',
    title: 'MVP de la semaine : KOUASSI Famien',
    excerpt: 'Dominant dans la raquette malgré la défaite contre l’ESCAE.',
    body: '',
    cover_url: null,
    published_at: null,
  },
  {
    id: 'home-news-availability',
    category: 'Indisponibilité',
    title: 'GBAGO Marc indisponible trois semaines',
    excerpt: 'Entorse de la cheville : retour prévu mi-octobre.',
    body: '',
    cover_url: null,
    published_at: null,
  },
]

export function withNewsFallback(news: PublishedNews[]) {
  return news.length ? news : fallbackNews
}
