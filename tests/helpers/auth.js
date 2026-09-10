import { expect } from '@playwright/test'

export const user = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'prueba@example.com',
  email_confirmed_at: '2026-09-01T12:00:00Z',
  created_at: '2026-09-01T12:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Persona de prueba' },
}
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const tokenFor = (id) => [
  encode({ alg: 'HS256', typ: 'JWT' }),
  encode({ sub: id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }),
  'test-signature',
].join('.')
const accessToken = tokenFor(user.id)
export const session = { access_token: accessToken, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user }

export const createSession = (account) => ({ ...session, access_token: tokenFor(account.id), user: account })

// La biblioteca real de Supabase se ejecuta; solo simulamos sus respuestas HTTP.
export async function mockAuth(context, overrides = {}, account = user) {
  const requests = []
  let profile = { id: account.id, full_name: account.user_metadata.full_name, created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }
  await context.route('https://**.supabase.co/**', async (route) => {
    const url = new URL(route.request().url())
    expect(url.hostname).toBe('auth-test.supabase.co')
    const operation = url.pathname.split('/').pop()
    requests.push({ operation, url, body: route.request().postDataJSON() })
    if (overrides[operation]) return overrides[operation](route)
    if (operation === 'profiles') {
      if (url.searchParams.get('id') !== 'eq.' + account.id) return route.fulfill({ json: [] })
      if (route.request().method() === 'PATCH') {
        profile = { ...profile, ...route.request().postDataJSON() }
        return route.fulfill({ json: profile })
      }
      return route.fulfill({ json: [profile] })
    }
    if (operation === 'token') return route.fulfill({ json: createSession(account) })
    if (operation === 'user' || operation === 'signup') return route.fulfill({ json: account })
    if (operation === 'recover' || operation === 'logout') return route.fulfill({ json: {} })
    throw new Error('Solicitud de autenticación inesperada: ' + operation)
  })
  return requests
}

export async function login(page, account = user) {
  await page.goto('/')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(account.email)
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-segura-123')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hola, ' + account.user_metadata.full_name })).toBeVisible()
}

export async function openRecovery(page, query = '?auth=recovery') {
  await page.goto('/' + query + '#access_token=' + accessToken +
    '&refresh_token=test-refresh&token_type=bearer&expires_in=3600&type=recovery')
  await expect(page.getByRole('heading', { name: 'Nueva contraseña', exact: true })).toBeVisible()
}
