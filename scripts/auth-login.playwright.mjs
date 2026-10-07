import assert from 'node:assert/strict'

const { chromium } = await import('playwright').catch(() => {
  throw new Error('Playwright n’est pas installé. Installe-le dans l’environnement de test, puis relance ce script.')
})

const baseUrl = process.env.AUTH_TEST_BASE_URL || 'http://localhost:3000'
const browser = await chromium.launch({ headless: true })
const pass = (name) => console.log(`PASS | ${name}`)

try {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } })
  let loginCalls = 0
  let documentNavigations = 0
  page.on('request', (request) => { if (request.isNavigationRequest()) documentNavigations++ })
  await page.route('**/api/auth/login', async (route) => {
    loginCalls++
    await new Promise((resolve) => setTimeout(resolve, 300))
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Identifiants incorrects.' }) })
  })

  const response = await page.goto(`${baseUrl}/login`)
  assert.equal(response?.status(), 200)
  assert.match(response?.headers()['cache-control'] || '', /no-store/i)
  pass('/login HTTP 200 et Cache-Control no-store')

  const email = page.getByLabel('Adresse e-mail')
  const password = page.getByLabel('Mot de passe')
  assert.equal(await email.getAttribute('autocomplete'), 'username')
  assert.equal(await email.getAttribute('autocorrect'), 'off')
  assert.equal(await password.getAttribute('autocomplete'), 'current-password')
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'email')
  pass('Focus e-mail initial et autofill navigateur')

  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360)
  await page.setViewportSize({ width: 1440, height: 900 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1440)
  pass('Aucun scroll horizontal à 360 px et 1440 px')

  await password.fill('Bad-password-01!')
  await page.getByRole('button', { name: 'Afficher' }).click()
  assert.equal(await password.getAttribute('type'), 'text')
  await password.press('Escape')
  assert.equal(await password.getAttribute('type'), 'password')
  pass('Affichage du mot de passe et fermeture avec Échap')

  await email.fill('qa@example.invalid')
  const submit = page.getByRole('button', { name: 'Se connecter' })
  await submit.evaluate((button) => { button.click(); button.click() })
  await page.getByRole('button', { name: 'Connexion…' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Connexion…' }).isDisabled(), true)
  await page.getByRole('alert').filter({ hasText: 'Identifiants incorrects.' }).waitFor()
  assert.equal(loginCalls, 1)
  assert.equal(documentNavigations, 1)
  pass('Double soumission bloquée, état loading, erreur accessible, sans rechargement')

  const bundleUrls = await page.locator('script[src]').evaluateAll((scripts) => scripts.map((script) => script.src).filter((src) => src.includes('/_next/static/')))
  const forbiddenNames = ['SUPABASE_SERVICE_ROLE_KEY', 'BREVO_API_KEY', 'OTP_PEPPER']
  for (const url of bundleUrls) {
    const content = await (await page.request.get(url)).text()
    for (const name of forbiddenNames) assert.equal(content.includes(name), false, `Nom de variable serveur trouvé dans le bundle: ${name}`)
    assert.equal(/xkeysib-[A-Za-z0-9-]{20,}/.test(content), false, 'Une clé Brevo semble présente dans un bundle client.')
  }
  pass('Aucun nom de secret ni clé Brevo repéré dans les bundles chargés')
} finally {
  await browser.close()
}
