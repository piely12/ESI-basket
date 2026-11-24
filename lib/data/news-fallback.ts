import type { PublishedNews } from '@/lib/data/public'

export const fallbackNews: PublishedNews[] = [
  {
    id: 'home-news-match',
    category: 'Match',
    title: 'Victoire d’entrée face à l’ESTP',
    excerpt: 'Les Lions remportent leur premier match de la saison 48–32.',
    body: '',
    cover_url: null,
    published_at: null,
  },
  {
    id: 'home-news-mvp',
    category: 'MVP',
    title: 'MVP du match : AMON Loïc',
    excerpt: '14 points et 3 passes décisives face à l’ESTP.',
    body: '',
    cover_url: null,
    published_at: null,
  },
  {
    id: 'home-news-next',
    category: 'Prochain match',
    title: 'E. Projet – ESI, samedi 28 novembre',
    excerpt: 'Coup d’envoi à 21h au Gymnase du Sud.',
    body: '',
    cover_url: null,
    published_at: null,
  },
]

export function withNewsFallback(news: PublishedNews[]) {
  return news.length ? news : fallbackNews
}
