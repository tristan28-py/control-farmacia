export const connectionMessage = 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'

export function getDataErrorMessage(error, operation) {
  const prefix = operation === 'save' ? 'No pudimos guardar tu perfil.' : 'No pudimos cargar tu perfil.'
  let reason = 'Inténtalo de nuevo.'
  if (error?.code === 'PROFILE_MISSING' || error?.code === 'PGRST116') {
    reason = 'Tu perfil todavía no está disponible. Intenta de nuevo o contacta con soporte.'
  } else if (error?.status === 401 || ['PGRST301', 'PGRST302', 'PGRST303'].includes(error?.code)) {
    reason = 'Tu sesión no es válida o venció. Vuelve a iniciar sesión.'
  } else if (error?.status === 403 || error?.code === '42501') {
    reason = 'No tienes permiso para realizar esta operación.'
  } else if (error?.status === 0) {
    reason = connectionMessage
  } else if (error?.status >= 500) {
    reason = 'El servicio no está disponible temporalmente. Inténtalo más tarde.'
  }
  return `${prefix} ${reason}${operation === 'save' ? ' Tus cambios siguen aquí para que puedas reintentarlo.' : ''}`
}
