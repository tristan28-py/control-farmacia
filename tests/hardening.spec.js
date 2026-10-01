import { test, expect } from '@playwright/test'
import { user, mockAuth, login, createSession, openRecovery } from './helpers/auth'

test('metadata no textual no rompe la cuenta mientras carga el perfil', async ({ page, context }) => {
  const account = { ...user, user_metadata: { full_name: { invalid: true } } }
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mockAuth(context, {
    profiles: (route) => route.fulfill({ json: [{ id: user.id, full_name: null }] }),
  }, account)
  await page.goto('/')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email)
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-segura-123')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hola, prueba' })).toBeVisible()
  await expect(page.getByLabel('Nombre completo')).toHaveValue('')
  expect(errors).toEqual([])
})

for (const url of ['', 'https:example.com', 'invalid-url']) {
  test(`configuración inválida muestra un estado seguro: ${url || 'vacía'}`, async ({ page, context }) => {
    const requests = await mockAuth(context)
    await page.route('**/src/lib/supabase.js', async (route) => {
      const response = await route.fetch()
      const body = (await response.text()).replace('import.meta.env.VITE_SUPABASE_URL?.trim()', JSON.stringify(url))
      await route.fulfill({ response, body })
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Acceso no disponible' })).toBeVisible()
    expect(requests).toEqual([])
  })
}

test('Error Boundary oculta detalles y permite recargar', async ({ page, context }) => {
  await mockAuth(context)
  // Fallo de render inyectado exclusivamente por HTTP en el entorno de pruebas.
  await page.route('**/src/components/HomeView.jsx', async (route) => {
    await route.fulfill({ contentType: 'application/javascript', body:
      'export function HomeView() { throw new Error("INTERNAL_SECRET_DETAIL") }' })
  })
  await page.goto('/')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email)
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-segura-123')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Algo salió mal' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('INTERNAL_SECRET_DETAIL')
  await page.unroute('**/src/components/HomeView.jsx')
  await page.getByRole('button', { name: 'Recargar página' }).click()
  await expect(page.getByRole('heading', { name: 'Tu cuenta', exact: true })).toBeVisible()
})

test('la pausa persiste y el sistema tiene prioridad sin borrar la elección', async ({ page, context }) => {
  await mockAuth(context)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Pausar animaciones' }).click()
  await page.reload()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-motion', 'paused')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('button', { name: 'Activar animaciones' })).toBeDisabled()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.site-shell')).toHaveAttribute('data-motion', 'paused')
  await page.getByRole('button', { name: 'Activar animaciones' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.site-shell')).toHaveAttribute('data-motion', 'paused')
  expect(await page.locator('.pulse-trace').evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
})

test('almacenamiento bloqueado no impide cambiar el movimiento', async ({ page, context }) => {
  await mockAuth(context)
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'control-farmacia:motion') throw new DOMException('Blocked', 'SecurityError')
      return original.call(this, key, value)
    }
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Pausar animaciones' }).click()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-motion', 'paused')
})

test('mostrar contraseña es accesible y se reinicia al cambiar de formulario', async ({ page, context }) => {
  const requests = await mockAuth(context)
  await page.goto('/')
  const input = page.getByLabel('Contraseña', { exact: true })
  await input.fill('Prueba-segura-123')
  await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(input).toHaveAttribute('type', 'text')
  expect(requests).toEqual([])
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(input).toHaveAttribute('type', 'password')
  await expect(input).toHaveValue('')
})

for (const scenario of ['network', 'session', 'permission']) {
  test(`errores de perfil diferenciados sin detalles internos: ${scenario}`, async ({ page, context }) => {
    await mockAuth(context, {
      profiles: (route) => scenario === 'network' ? route.abort('failed') : route.fulfill({
        status: scenario === 'session' ? 401 : 403,
        json: { code: scenario === 'session' ? 'PGRST301' : '42501', message: 'INTERNAL_DATABASE_DETAIL' },
      }),
    })
    await login(page)
    await expect(page.getByRole('alert')).toContainText(scenario === 'network' ? 'Revisa tu conexión' :
      scenario === 'session' ? 'Vuelve a iniciar sesión' : 'No tienes permiso', { timeout: 15000 })
    await expect(page.locator('body')).not.toContainText('INTERNAL_DATABASE_DETAIL')
  })
}

for (const pendingOperation of ['GET', 'PATCH']) {
  test(`respuesta tardía de ${pendingOperation} no contamina al siguiente usuario`, async ({ page, context }) => {
    const userB = { ...user, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', user_metadata: { full_name: 'Persona B' } }
    let release
    const pending = new Promise((resolve) => { release = resolve })
    let started = false
    let delivered = false
    const aborted = []
    page.on('requestfailed', (request) => {
      if (request.url().includes('/rest/v1/profiles')) aborted.push(request.method())
    })
    await mockAuth(context, {
      token: (route) => route.fulfill({ json: createSession(started ? userB : user) }),
      profiles: async (route) => {
        const isA = new URL(route.request().url()).searchParams.get('id') === 'eq.' + user.id
        if (isA && route.request().method() === pendingOperation) {
          started = true
          await pending
        }
        const profile = { id: isA ? user.id : userB.id, full_name: isA ? 'Persona de prueba' : 'Persona B' }
        await route.fulfill({ json: route.request().method() === 'GET' ? [profile] : profile })
        if (isA && route.request().method() === pendingOperation) delivered = true
      },
    })
    await login(page)
    if (pendingOperation === 'PATCH') {
      await page.getByLabel('Nombre completo').fill('Borrador A')
      await page.getByRole('button', { name: 'Guardar cambios' }).click()
    }
    await expect.poll(() => started).toBe(true)
    await page.evaluate(async () => {
      const { supabase } = await import('/src/lib/supabase.js')
      await supabase.auth.signInWithPassword({ email: 'b@example.com', password: 'test-password' })
    })
    await expect(page.getByLabel('Nombre completo')).toHaveValue('Persona B')
    release()
    await expect.poll(() => delivered).toBe(true)
    await expect.poll(() => aborted.includes(pendingOperation)).toBe(true)
    await expect(page.getByRole('heading', { name: 'Hola, Persona B' })).toBeVisible()
    await expect(page.getByLabel('Nombre completo')).toHaveValue('Persona B')
    await expect(page.getByRole('status')).toHaveCount(0)
  })
}

test('eventos de acceso repetidos conservan el borrador y la recuperación', async ({ page, context }) => {
  await mockAuth(context)
  await login(page)
  await page.getByLabel('Nombre completo').fill('Borrador sin guardar')
  await page.evaluate(async () => {
    const { supabase } = await import('/src/lib/supabase.js')
    for (let i = 0; i < 2; i++) {
      await supabase.auth.signInWithPassword({ email: 'prueba@example.com', password: 'test-password' })
    }
  })
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Borrador sin guardar')
  await openRecovery(page)
  await page.evaluate(async () => {
    const { supabase } = await import('/src/lib/supabase.js')
    await supabase.auth.signInWithPassword({ email: 'prueba@example.com', password: 'test-password' })
  })
  await expect(page.getByRole('heading', { name: 'Nueva contraseña', exact: true })).toBeVisible()
})

test('error del SDK al validar enlace termina la carga con un mensaje seguro', async ({ page, context }) => {
  await mockAuth(context, {
    user: (route) => route.fulfill({ status: 401, json: { message: 'INTERNAL_TOKEN_DETAIL' } }),
  })
  await page.goto('/?auth=recovery#access_token=invalid-token&refresh_token=fake&token_type=bearer&expires_in=3600&type=recovery')
  await expect(page.getByRole('alert')).toContainText('El enlace no es válido o venció')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('INTERNAL_TOKEN_DETAIL')
})

test('servicio impone el límite antes de enviar y admite 100 caracteres y espacios vacíos', async ({ page, context }) => {
  const requests = await mockAuth(context)
  await login(page)
  const errorName = await page.evaluate(async (id) => {
    const { updateProfile } = await import('/src/services/profileService.js')
    try { await updateProfile(id, 'x'.repeat(101), new AbortController().signal) }
    catch (error) { return error.name }
  }, user.id)
  expect(errorName).toBe('RangeError')
  expect(requests.filter((entry) => entry.operation === 'profiles' && entry.body)).toHaveLength(0)
  await page.getByLabel('Nombre completo').fill('x'.repeat(100))
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('status')).toContainText('se guardó correctamente')
  await page.getByLabel('Nombre completo').fill('   ')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('status')).toContainText('se guardó correctamente')
  const updates = requests.filter((entry) => entry.operation === 'profiles' && entry.body)
  expect(updates.map((entry) => entry.body)).toEqual([{ full_name: 'x'.repeat(100) }, { full_name: null }])
})
