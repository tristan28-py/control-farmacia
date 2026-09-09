export const MIN_PASSWORD_LENGTH = 8

const messages = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Confirma tu correo antes de iniciar sesión. Revisa también la carpeta de spam.',
  user_already_exists: 'No se pudo crear la cuenta. Intenta iniciar sesión o recuperar tu contraseña.',
  email_exists: 'No se pudo crear la cuenta. Intenta iniciar sesión o recuperar tu contraseña.',
  weak_password: 'La contraseña no cumple los requisitos de seguridad. Usa una más larga y combina letras, números y símbolos.',
  same_password: 'Elige una contraseña diferente de la actual.',
  over_email_send_rate_limit: 'Espera unos minutos antes de solicitar otro correo.',
  over_request_rate_limit: 'Has realizado muchos intentos. Espera unos minutos y vuelve a intentarlo.',
  signup_disabled: 'El registro de cuentas no está disponible en este momento.',
  otp_expired: 'El enlace venció o ya fue utilizado. Solicita un correo nuevo.',
  session_not_found: 'Tu sesión venció. Inicia sesión o solicita un nuevo enlace de recuperación.',
  refresh_token_not_found: 'Tu sesión venció. Vuelve a iniciar sesión.',
}

export function getAuthErrorMessage(error) {
  if (messages[error?.code]) return messages[error.code]
  if (error?.status === 429) return messages.over_request_rate_limit
  if (error?.name === 'AuthSessionMissingError') return messages.session_not_found
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'
  }
  return 'No pudimos completar la solicitud. Inténtalo de nuevo.'
}
