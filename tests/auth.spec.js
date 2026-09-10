import { test, expect } from '@playwright/test'
import { user, session, mockAuth, login, openRecovery } from './helpers/auth'

test('muestra errores de acceso en español y permite reintentar', async ({ page, context }) => {
  await mockAuth(context, {
    token: (route) => route.fulfill({ status: 400, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' }, json: { code: 'invalid_credentials', msg: 'Invalid login credentials' } }),
  })
  await page.goto('/')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email)
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('El correo o la contraseña no son correctos.')
  await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeEnabled()
})

test('valida el registro y explica la confirmación por correo', async ({ page, context }) => {
  const requests = await mockAuth(context)
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email)
  await page.getByLabel('Contraseña', { exact: true }).fill('corta')
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('corta')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('al menos 8')
  await page.getByLabel('Contraseña', { exact: true }).fill('Una-clave-larga-123')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('no coinciden')
  expect(requests).toHaveLength(0)
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Una-clave-larga-123')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Revisa tu correo')
  expect(requests[0].url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:4175/')
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('')
})

test('admite registro cuando la confirmación por correo está desactivada', async ({ page, context }) => {
  await mockAuth(context, { signup: (route) => route.fulfill({ json: session }) })
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email)
  await page.getByLabel('Contraseña', { exact: true }).fill('Una-clave-larga-123')
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Una-clave-larga-123')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tu cuenta', exact: true })).toBeVisible()
})

test('restaura la sesión y propaga el cierre a otra pestaña', async ({ page, context }) => {
  await mockAuth(context)
  await login(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tu cuenta', exact: true })).toBeVisible()
  const otherPage = await context.newPage()
  await otherPage.goto('/')
  await expect(otherPage.getByRole('heading', { name: 'Tu cuenta', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await expect(otherPage.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
})

test('mantiene el aviso si Supabase cierra la sesión local pero falla el servidor', async ({ page, context }) => {
  await mockAuth(context, {
    logout: (route) => route.fulfill({ status: 422, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' }, json: { code: 'unexpected_failure', msg: 'Internal details' } }),
  })
  await login(page)
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('No pudimos confirmar el cierre con el servidor')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeEnabled()
})

test('solicita recuperación con una respuesta neutral y la URL correcta', async ({ page, context }) => {
  const requests = await mockAuth(context)
  await page.goto('/')
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email)
  await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click()
  await expect(page.getByRole('status')).toContainText('Si existe una cuenta')
  expect(requests[0].url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:4175/?auth=recovery')
})

for (const query of ['?auth=recovery', '']) {
  test('conserva la recuperación al recargar y confirma el cambio: ' + (query || 'enlace anterior'), async ({ page, context }) => {
    await mockAuth(context)
    await openRecovery(page, query)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Nueva contraseña', exact: true })).toBeVisible()
    await page.getByLabel('Nueva contraseña', { exact: true }).and(page.locator('input')).fill('Nueva-clave-segura-123')
    await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Nueva-clave-segura-123')
    await page.getByRole('button', { name: 'Guardar nueva contraseña' }).click()
    await expect(page.getByRole('status')).toHaveText('Tu contraseña se actualizó correctamente.')
    await expect(page.getByRole('heading', { name: 'Tu cuenta', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Continuar a mi cuenta' }).click()
    await expect(page.getByRole('heading', { name: 'Tu cuenta', exact: true })).toBeVisible()
    await expect(page).toHaveURL('http://127.0.0.1:4175/')
  })
}

test('rechaza un enlace vencido y permite pedir uno nuevo', async ({ page, context }) => {
  await mockAuth(context)
  await page.goto('/?auth=recovery#error=access_denied&error_code=otp_expired&error_description=Sensitive-detail')
  await expect(page.getByRole('alert')).toContainText('enlace no es válido o venció')
  await expect(page.getByRole('heading', { name: 'Nueva contraseña', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click()
  await expect(page.getByRole('heading', { name: 'Recuperar contraseña', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page).toHaveURL('http://127.0.0.1:4175/')
})

test('un marcador de recuperación sin sesión no permite cambiar contraseñas', async ({ page, context }) => {
  const requests = await mockAuth(context)
  await page.goto('/?auth=recovery')
  await expect(page.getByRole('alert')).toContainText('enlace no es válido o venció')
  await expect(page.getByRole('button', { name: 'Guardar nueva contraseña' })).toHaveCount(0)
  expect(requests).toHaveLength(0)
})

test('cancelar la recuperación cierra la sesión', async ({ page, context }) => {
  await mockAuth(context)
  await openRecovery(page)
  await page.getByRole('button', { name: 'Cancelar y cerrar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
})

test('bloquea envíos repetidos y navegación durante la solicitud', async ({ page, context }) => {
  let release
  const pending = new Promise((resolve) => { release = resolve })
  const requests = await mockAuth(context, {
    recover: async (route) => {
      await pending
      return route.fulfill({ json: {} })
    },
  })
  await page.goto('/')
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email)
  await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click()
  await expect(page.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Volver a iniciar sesión' })).toBeDisabled()
  await page.locator('form').evaluate((form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  await expect.poll(() => requests.length).toBe(1)
  release()
  await expect(page.getByRole('status')).toContainText('Si existe una cuenta')
})

test('la pantalla de acceso cabe en móvil y usa el idioma correcto', async ({ page, context }) => {
  await mockAuth(context)
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
