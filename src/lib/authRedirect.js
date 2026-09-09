// El marcador mantiene la pantalla de recuperación al recargar; no concede acceso.
export function readAuthRedirect() {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.slice(1))
  return {
    recovery: url.searchParams.get('auth') === 'recovery' || hash.get('type') === 'recovery',
    error: hash.has('error') || hash.has('error_code') ||
      url.searchParams.has('error') || url.searchParams.has('error_code'),
  }
}

export function getAuthRedirectUrl(recovery = false) {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  if (recovery) url.searchParams.set('auth', 'recovery')
  return url.href
}

export function setRecoveryLocation(recovery) {
  const url = new URL(window.location.href)
  if (recovery) url.searchParams.set('auth', 'recovery')
  else url.searchParams.delete('auth')
  for (const key of ['error', 'error_code', 'error_description']) {
    url.searchParams.delete(key)
  }
  const hash = new URLSearchParams(url.hash.slice(1))
  if (!url.hash || ['access_token', 'refresh_token', 'error', 'error_code', 'type'].some((key) => hash.has(key))) {
    url.hash = ''
  }
  window.history.replaceState(window.history.state, '', url)
}
