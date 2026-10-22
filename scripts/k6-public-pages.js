import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = (__ENV.BASE_URL || '').replace(/\/$/, '')
const pages = ['/', '/matchs', '/classement', '/equipe', '/actualites', '/reglages']
const mode = __ENV.MODE || 'peak'

if (!baseUrl) throw new Error('Set BASE_URL, for example https://staging.example.com')
if (!['peak', 'volume'].includes(mode)) throw new Error('MODE must be peak or volume')

export const options = {
  scenarios: mode === 'peak'
    ? {
        peak_1000: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '2m', target: 100 },
            { duration: '2m', target: 300 },
            { duration: '2m', target: 600 },
            { duration: '3m', target: 1000 },
            { duration: '5m', target: 1000 },
            { duration: '5m', target: 0 },
          ],
          gracefulRampDown: '30s',
        },
      }
    : {
        total_7000: {
          executor: 'shared-iterations',
          vus: 1000,
          iterations: 7000,
          maxDuration: '20m',
          gracefulStop: '30s',
        },
      },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2500', 'p(99)<5000'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
  },
}

export default function userJourney() {
  for (const page of pages) {
    const response = http.get(`${baseUrl}${page}`, {
      tags: { page },
      redirects: 5,
      timeout: '30s',
    })
    check(response, {
      [`${page} responds successfully`]: (res) => res.status === 200,
    })
    sleep(0.5)
  }
}
