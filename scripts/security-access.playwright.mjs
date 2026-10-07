// Optional role authorization smoke test. Requires Playwright and test-only
// credentials supplied through SECURITY_TEST_ACCOUNTS_JSON; never prints them.
import { chromium } from 'playwright'

const baseUrl = process.env.SECURITY_TEST_BASE_URL || 'http://localhost:3000'
const rawAccounts = process.env.SECURITY_TEST_ACCOUNTS_JSON
if (!rawAccounts) {
  console.error('NON EXÉCUTÉ: define SECURITY_TEST_ACCOUNTS_JSON with test-only credentials.')
  process.exit(2)
}

const expectedPaths = {
  admin: '/admin',
  coach: '/coach',
  coach_adjoint: '/coach',
  statisticienne: '/stats',
  videaste: '/actus',
  joueur: '/joueurs',
}
const protectedPaths = ['/coach', '/stats', '/actus', '/joueurs', '/admin']
let accounts
try {
  accounts = JSON.parse(rawAccounts)
  if (!Array.isArray(accounts)) throw new Error('Invalid account list')
} catch {
  console.error('FAIL: invalid test account configuration (values omitted).')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
let failed = false
try {
  for (const role of Object.keys(expectedPaths)) {
    const account = accounts.find((item) => item?.role === role)
    if (!account || typeof account.email !== 'string' || typeof account.password !== 'string') {
      console.log(`NON EXÉCUTÉ ${role}: test account not configured.`)
      continue
    }
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Adresse e-mail').fill(account.email)
      await page.getByLabel('Mot de passe', { exact: false }).fill(account.password)
      await page.getByRole('button', { name: /se connecter/i }).click()
      await page.waitForURL((url) => url.pathname === expectedPaths[role], { timeout: 15000 })
      console.log(`PASS ${role}: redirects to expected workspace.`)
      for (const path of protectedPaths) {
        await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' })
        const allowed = role === 'admin' || path === expectedPaths[role]
        if (allowed) {
          await page.waitForURL((url) => url.pathname === path, { timeout: 10000 })
        } else {
          await page.waitForURL((url) => url.pathname === '/acces-refuse', { timeout: 10000 })
        }
      }
      console.log(`PASS ${role}: protected route matrix checked.`)
    } catch {
      failed = true
      console.log(`FAIL ${role}: login or authorization assertion failed; credentials omitted.`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
process.exitCode = failed ? 1 : 0
