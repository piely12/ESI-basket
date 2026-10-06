import { SITES, type Site } from '@/lib/sites'

// coach.esi-basket.ci + 'stats' -> https://stats.esi-basket.ci/
export function siteUrl(currentHost: string, site: Site, proto: string): string {
  const [hostname, port] = currentHost.split(':')
  const labels = hostname.split('.')
  const base = (SITES as readonly string[]).includes(labels[0]) ? labels.slice(1) : labels
  return `${proto}://${site}.${base.join('.')}${port ? ':' + port : ''}/`
}
