import { test, expect } from '@playwright/test'
import { user, mockAuth, login, createSession } from './helpers/auth'

test('carga y guarda solo el nombre del usuario; persiste al recargar sin errores de consola', async ({ page, context }) => {
  const consoleErrors = []
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  const requests = await mockAuth(context)
  await login(page)
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue(user.user_metadata.full_name)
  await expect(page.getByText(user.email, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  await page.getByLabel('Nombre completo', { exact: true }).fill('  Nombre nuevo  ')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('status')).toHaveText('Tu perfil se guardó correctamente.')
  await expect(page.getByRole('heading', { name: 'Hola, Nombre nuevo' })).toBeVisible()
  const updates = requests.filter((request) => request.operation === 'profiles' && request.body)
  expect(updates).toHaveLength(1)
  expect(updates[0].body).toEqual({ full_name: 'Nombre nuevo' })
  expect(updates[0].url.searchParams.get('id')).toBe('eq.' + user.id)
  for (const request of requests.filter((entry) => entry.operation === 'profiles')) {
    expect(request.url.searchParams.get('id')).toBe('eq.' + user.id)
  }
  await page.reload()
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Nombre nuevo')
  expect(consoleErrors).toEqual([])
})

test('permite borrar el nombre opcional sin cambiar el email', async ({ page, context }) => {
  const requests = await mockAuth(context)
  await login(page)
  await page.getByLabel('Nombre completo', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('status')).toContainText('se guardó correctamente')
  expect(requests.find((request) => request.operation === 'profiles' && request.body).body).toEqual({ full_name: null })
  await expect(page.getByText(user.email, { exact: true })).toBeVisible()
  await expect(page.locator('input[name="id"], input[name="email"]')).toHaveCount(0)
})

test('muestra carga y permite reintentar cuando falla la consulta', async ({ page, context }) => {
  let fail = true
  await mockAuth(context, {
    profiles: (route) => fail
      ? route.fulfill({ status: 503, json: { message: 'Simulated unavailable database' } })
      : route.fulfill({ json: [{ id: user.id, full_name: 'Recuperado' }] }),
  })
  await login(page)
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar tu perfil', { timeout: 15000 })
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Reintentar carga' }).click()
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Recuperado')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('un perfil ausente no provoca inserciones desde el navegador', async ({ page, context }) => {
  const requests = await mockAuth(context, { profiles: (route) => route.fulfill({ json: [] }) })
  await login(page)
  await expect(page.getByRole('alert')).toContainText('Tu perfil todavía no está disponible')
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0)
  expect(requests.filter((request) => request.operation === 'profiles').every((request) => request.body === null)).toBe(true)
})

for (const zeroRows of [false, true]) {
  test('un guardado fallido conserva el borrador y no anuncia éxito: ' + (zeroRows ? 'cero filas' : 'servidor'), async ({ page, context }) => {
    let fail = true
    await mockAuth(context, {
      profiles: (route) => {
        if (route.request().method() === 'GET') return route.fulfill({ json: [{ id: user.id, full_name: 'Persona de prueba' }] })
        if (fail) return route.fulfill({
          status: zeroRows ? 406 : 503,
          json: { code: zeroRows ? 'PGRST116' : 'unavailable', message: 'Simulated save failure' },
        })
        return route.fulfill({ json: { id: user.id, full_name: 'Mi borrador' } })
      },
    })
    await login(page)
    await page.getByLabel('Nombre completo', { exact: true }).fill('Mi borrador')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('alert')).toContainText('No pudimos guardar tu perfil')
    await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Mi borrador')
    await expect(page.getByRole('status')).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('status')).toContainText('se guardó correctamente')
  })
}

test('muestra el estado de carga y bloquea guardados duplicados', async ({ page, context }) => {
  let releaseLoad, releaseSave
  const loading = new Promise((resolve) => { releaseLoad = resolve })
  const saving = new Promise((resolve) => { releaseSave = resolve })
  const requests = await mockAuth(context, {
    profiles: async (route) => {
      if (route.request().method() === 'GET') {
        await loading
        return route.fulfill({ json: [{ id: user.id, full_name: 'Persona de prueba' }] })
      }
      await saving
      return route.fulfill({ json: { id: user.id, full_name: 'Nuevo' } })
    },
  })
  await login(page)
  await expect(page.getByRole('status')).toHaveText('Cargando perfil…')
  releaseLoad()
  await page.getByLabel('Nombre completo', { exact: true }).fill('Nuevo')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
  await expect(page.getByLabel('Nombre completo', { exact: true })).toBeDisabled()
  await page.getByRole('form', { name: 'Editar perfil' }).evaluate((form) =>
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  releaseSave()
  await expect(page.getByRole('status')).toContainText('se guardó correctamente')
  expect(requests.filter((request) => request.operation === 'profiles' && request.body)).toHaveLength(1)
})

test('dos cuentas muestran sus propios datos y el perfil cabe en móvil', async ({ page, context, browser }, testInfo) => {
  await mockAuth(context)
  await login(page)
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Persona de prueba')
  const userB = { ...user, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'persona-b@example.com', user_metadata: { full_name: 'Persona B' } }
  const contextB = await browser.newContext({ viewport: { width: 360, height: 740 } })
  try {
    await mockAuth(contextB, {}, userB)
    const pageB = await contextB.newPage()
    await login(pageB, userB)
    await expect(pageB.getByLabel('Nombre completo', { exact: true })).toHaveValue('Persona B')
    await expect(pageB.getByText(user.email, { exact: true })).toHaveCount(0)
    expect(await pageB.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await pageB.screenshot({ path: testInfo.outputPath('perfil-movil.png'), fullPage: true })
  } finally {
    await contextB.close()
  }
})

test('al cambiar de usuario no muestra el perfil anterior mientras carga el siguiente', async ({ page, context }) => {
  const userB = { ...user, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'persona-b@example.com', user_metadata: { full_name: 'Persona B' } }
  let release
  const pending = new Promise((resolve) => { release = resolve })
  await mockAuth(context, {
    token: (route) => route.fulfill({ json: createSession(route.request().postDataJSON().email === userB.email ? userB : user) }),
    profiles: async (route) => {
      const isB = new URL(route.request().url()).searchParams.get('id') === 'eq.' + userB.id
      if (isB) await pending
      const account = isB ? userB : user
      return route.fulfill({ json: [{ id: account.id, full_name: account.user_metadata.full_name }] })
    },
  })
  await login(page)
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Persona de prueba')
  await page.evaluate(async (email) => {
    const { supabase } = await import('/src/lib/supabase.js')
    const { error } = await supabase.auth.signInWithPassword({ email, password: 'Prueba-segura-123' })
    if (error) throw error
  }, userB.email)
  await expect(page.getByRole('status')).toHaveText('Cargando perfil…')
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveCount(0)
  await expect(page.getByText(user.email, { exact: true })).toHaveCount(0)
  release()
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Persona B')
})
