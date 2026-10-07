const baseUrl = process.env.SECURITY_TEST_BASE_URL || 'http://localhost:3000'
const failures = []

async function request(path) {
  return fetch(new URL(path, baseUrl), { redirect: 'manual', cache: 'no-store' })
}

for (const path of ['/admin', '/coach', '/stats', '/actus', '/joueurs']) {
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
