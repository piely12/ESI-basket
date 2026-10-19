// Local-only test fixture helper. Production account creation belongs in /admin.
import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { z } from 'zod'

const ROLES = ['coach', 'statisticienne', 'joueur']
const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(ROLES),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(72)
    .regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/).regex(/[^A-Za-z0-9]/),
  jersey: z.number().int().min(0).max(99).optional(),
})

async function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Use an interactive terminal; secret input is not accepted as a command argument.')
  }
  stdout.write(prompt)
  stdin.setRawMode(true)
  stdin.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    const finish = (error) => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener('data', onData)
      stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }
    const onData = (buffer) => {
      for (const char of buffer.toString('utf8')) {
        if (char === '\u0003') return finish(new Error('Cancelled.'))
        if (char === '\r' || char === '\n') return finish()
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
        else if (char >= ' ') value += char
      }
    }
    stdin.on('data', onData)
  })
}

async function main() {
  if (process.env.APP_ALLOW_LOCAL_ACCOUNT_SCRIPT !== 'true' || process.env.NODE_ENV === 'production') {
    console.error('Disabled. Use the authenticated /admin workspace; set APP_ALLOW_LOCAL_ACCOUNT_SCRIPT=true only for a test project.')
    return 1
  }
  const prompt = createInterface({ input: stdin, output: stdout })
  let values
  try {
    const email = await prompt.question('Test e-mail: ')
    const role = await prompt.question(`Role (${ROLES.join(' / ')}): `)
    const firstName = await prompt.question('First name: ')
    const lastName = await prompt.question('Last name: ')
    const jerseyText = role === 'joueur' ? await prompt.question('Jersey number (optional): ') : ''
    prompt.close()
    const password = await readHidden('Temporary password (hidden): ')
    const parsed = inputSchema.safeParse({
      email, role, firstName, lastName, password,
      ...(jerseyText ? { jersey: Number(jerseyText) } : {}),
    })
    if (!parsed.success) {
      console.error('Invalid test account fields. Use a strong password and a non-admin role.')
      return 1
    }
    values = parsed.data
  } finally {
    prompt.close()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Supabase server configuration is missing.')
    return 1
  }
  const admin = createClient(url, key, { auth: { persistSession: false } })
  const { data: team, error: teamError } = await admin.from('teams').select('id').eq('is_esi', true).maybeSingle()
  if (teamError || !team) {
    console.error('Test team unavailable; no account was created.')
    return 1
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    console.error('Test account creation failed.')
    return 1
  }

  const profile = values.role === 'joueur'
    ? await admin.from('players').insert({
        team_id: team.id, user_id: created.user.id, first_name: values.firstName,
        last_name: values.lastName, jersey_number: values.jersey ?? null,
      })
    : await admin.from('staff').insert({
        team_id: team.id, user_id: created.user.id, first_name: values.firstName,
        last_name: values.lastName, role: values.role,
      })
  if (profile.error) {
    await admin.auth.admin.deleteUser(created.user.id)
    console.error('Test profile creation failed; the Auth user was removed.')
    return 1
  }

  console.log('Test account created. The first-login migration must be applied; do not use this helper in production.')
  return 0
}

process.exitCode = await main().catch(() => {
  console.error('Test account helper failed.')
  return 1
})
