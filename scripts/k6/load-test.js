/*
 * Test de charge k6 — The Lions of ESI
 *
 * Simule des visiteurs qui naviguent sur le site public (accueil, matchs,
 * fiche d'un match, classement, équipe, actualités) avec des pauses réalistes.
 *
 * Scénarios (variable SCENARIO) :
 *   smoke    10 visiteurs pendant 1 min : vérifie le script, sans risque.
 *   semaine  5000 visiteurs par semaine : le pic d'un jour de match
 *            (≈ 30 % des visiteurs de la semaine, dont la moitié dans
 *            l'heure du match), 750 sessions en 1 h, compressées en 15 min.
 *   pic      1000 visiteurs simultanés : montée en 3 min, 5 min à 1000,
 *            descente en 1 min.
 *
 * Utilisation :
 *   k6 run -e SCENARIO=smoke scripts/k6/load-test.js
 *   k6 run -e SCENARIO=pic -e BASE_URL=https://… scripts/k6/load-test.js
 *
 * ⚠️ « pic » envoie environ 200 pages par seconde. Ne pas le lancer un jour de
 * match, ni depuis une seule connexion domestique (elle saturerait avant le
 * site) : utiliser k6 Cloud ou une machine avec un gros débit.
 */
import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Trend, Rate } from 'k6/metrics'

const BASE_URL = (__ENV.BASE_URL || 'https://esi-basket-murex.vercel.app').replace(/\/$/, '')
const SCENARIO = __ENV.SCENARIO || 'smoke'

const SCENARIOS = {
  smoke: {
    executor: 'constant-vus', vus: 10, duration: '1m',
  },
  semaine: {
    // 750 sessions compressées en 15 min ≈ 0,83 nouvelle session par seconde.
    executor: 'constant-arrival-rate', rate: 50, timeUnit: '1m', duration: '15m',
    preAllocatedVUs: 50, maxVUs: 300,
  },
  pic: {
    executor: 'ramping-vus', startVUs: 0,
    stages: [
      { duration: '3m', target: 1000 },
      { duration: '5m', target: 1000 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
}

export const options = {
  scenarios: { [SCENARIO]: SCENARIOS[SCENARIO] },
  thresholds: {
    // Objectifs : 95 % des pages en moins de 2 s, moins de 1 % d'erreurs.
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:page}': ['p(95)<2000'],
    page_errors: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  userAgent: 'k6-load-test-lions-esi',
}

const pageTime = new Trend('page_time', true)
const pageErrors = new Rate('page_errors')

export function setup() {
  // One API call to learn real match and team ids.
  const response = http.get(`${BASE_URL}/api/public/matches`)
  const matches = response.status === 200 ? (response.json('matches') || []) : []
  const matchIds = matches.map((match) => match.id)
  const teamIds = [...new Set(matches.flatMap((match) => [match.home_team.id, match.away_team.id]))]
  if (!matchIds.length) console.warn('Aucun match trouvé : les fiches de match ne seront pas testées.')
  return { matchIds, teamIds }
}

function visit(name, path) {
  const response = http.get(`${BASE_URL}${path}`, { tags: { kind: 'page', name }, redirects: 3 })
  const ok = check(response, {
    [`${name} : statut 200`]: (r) => r.status === 200,
    [`${name} : page complète`]: (r) => typeof r.body === 'string' && r.body.includes('</html>'),
  })
  pageErrors.add(!ok, { name })
  pageTime.add(response.timings.duration, { name })
  return response
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const think = (min, max) => sleep(min + Math.random() * (max - min))

export default function (data) {
  group('Parcours visiteur', () => {
    visit('accueil', '/')
    think(3, 8)

    // Most visitors open the calendar, then a match sheet.
    visit('matchs', '/matchs')
    think(2, 6)
    if (data.matchIds.length) {
      visit('fiche match', `/matchs/${pick(data.matchIds)}`)
      think(5, 15)
    }

    if (Math.random() < 0.6) {
      visit('classement', '/classement')
      think(3, 8)
    }
    if (Math.random() < 0.4 && data.teamIds.length) {
      visit('fiche équipe', `/equipes/${pick(data.teamIds)}`)
      think(3, 8)
    }
    if (Math.random() < 0.4) {
      visit('effectif', '/equipe')
      think(3, 8)
    }
    if (Math.random() < 0.25) {
      visit('actualités', '/actualites')
      think(2, 6)
    }
  })
}
