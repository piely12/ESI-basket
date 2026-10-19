const baseUrl = process.env.SECURITY_TEST_BASE_URL || 'http://127.0.0.1:3000'
const failures = []

async function request(path) {
  return fetch(new URL(path, baseUrl), { redirect: 'manual', cache: 'no-store' })
}

// Include nested and parameterized pages so a newly added section page cannot
// accidentally become reachable without passing the workspace guards.
const privatePages = [
  '/admin',
  '/coach',
  '/coach/equipe',
  '/coach/matchs/nouveau',
  '/coach/matchs/00000000-0000-4000-8000-000000000001',
  '/stats',
  '/stats/00000000-0000-4000-8000-000000000001',
  '/actus',
  '/joueurs',
  '/premiere-connexion',
]

for (const path of privatePages) {
  try {
    const response = await request(path)
    const ok = [302, 307].includes(response.status)
    console.log(`${ok ? 'PASS' : 'FAIL'} GET ${path} => HTTP ${response.status}`)
    if (!ok) failures.push(path)
  } catch {
    console.log(`FAIL GET ${path} => request failed`)
    failures.push(path)
  }
}

for (const [path, body] of [
  ['/api/stats/00000000-0000-4000-8000-000000000001', { action: 'publish' }],
  ['/api/auth/first-login/complete', { otp: '123456', password: 'ValidPass1!', confirmation: 'ValidPass1!' }],
]) {
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: 'POST',
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', origin: baseUrl },
      body: JSON.stringify(body),
    })
    const ok = [401, 403].includes(response.status)
    console.log(`${ok ? 'PASS' : 'FAIL'} POST ${path} unauthenticated => HTTP ${response.status}`)
    if (!ok) failures.push(path)
  } catch {
    console.log(`FAIL POST ${path} unauthenticated => request failed`)
    failures.push(path)
  }
}

try {
  const response = await request('/test-connexion')
  const ok = response.status === 404
  console.log(`${ok ? 'PASS' : 'FAIL'} GET /test-connexion => HTTP ${response.status}`)
  if (!ok) failures.push('/test-connexion')
} catch {
  console.log('FAIL GET /test-connexion => request failed')
  failures.push('/test-connexion')
}

try {
  const response = await request('/login')
  const csp = response.headers.get('content-security-policy') || ''
  const nonce = csp.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1]
  const required = ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'"]
  const ok = response.status === 200 && nonce && required.every((directive) => csp.includes(directive))
  console.log(`${ok ? 'PASS' : 'FAIL'} GET /login => HTTP ${response.status}, nonce CSP ${nonce ? 'present' : 'missing'}`)
  for (const [name, expected] of [['x-content-type-options', 'nosniff'], ['x-frame-options', 'DENY']]) {
    const headerOk = response.headers.get(name)?.toLowerCase() === expected.toLowerCase()
    console.log(`${headerOk ? 'PASS' : 'FAIL'} ${name}`)
    if (!headerOk) failures.push(name)
  }
  if (!ok) failures.push('/login CSP')
} catch {
  console.log('FAIL GET /login => request failed')
  failures.push('/login')
}

if (failures.length) process.exitCode = 1
else console.log('Smoke checks passed. Database RLS and authenticated role access require the SQL/Playwright suites.')
