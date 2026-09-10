import { MedicalIcon } from '../MedicalIcon'
import { WellnessVisual } from '../WellnessVisual'
import { useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getAuthErrorMessage, MIN_PASSWORD_LENGTH } from '../../lib/authMessages'

const titles = {
  login: 'Iniciar sesión',
  register: 'Crear cuenta',
  forgot: 'Recuperar contraseña',
  recovery: 'Nueva contraseña',
}
const actions = {
  login: ['Iniciar sesión', 'Iniciando sesión…'],
  register: ['Crear cuenta', 'Creando cuenta…'],
  forgot: ['Enviar enlace de recuperación', 'Enviando…'],
  recovery: ['Guardar nueva contraseña', 'Guardando…'],
}

export function AuthView() {
  const {
    signIn, signUp, resetPassword, updatePassword, signOut,
    isRecoveryMode, finishRecovery, authError, clearAuthError,
  } = useAuth()
  const [selectedMode, setSelectedMode] = useState('login')
  const mode = isRecoveryMode ? 'recovery' : selectedMode
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const requestPending = useRef(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [passwordUpdated, setPasswordUpdated] = useState(false)
  const createsPassword = mode === 'register' || mode === 'recovery'

  function changeMode(nextMode) {
    if (requestPending.current) return
    setSelectedMode(nextMode)
    setErrorMsg('')
    setSuccessMsg('')
    clearAuthError()
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (requestPending.current) return
    setErrorMsg('')
    setSuccessMsg('')
    clearAuthError()

    if (createsPassword && password.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Usa al menos ${MIN_PASSWORD_LENGTH} caracteres para la contraseña.`)
      return
    }
    if (createsPassword && password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    requestPending.current = true
    setBusy(true)
    try {
      let result
      if (mode === 'login') result = await signIn(email, password)
      if (mode === 'register') result = await signUp(email, password, { full_name: fullName.trim() })
      if (mode === 'forgot') result = await resetPassword(email)
      if (mode === 'recovery') result = await updatePassword(password)
      if (result.error) throw result.error

      setPassword('')
      setConfirmPassword('')
      if (mode === 'register' && !result.data.session) {
        setSuccessMsg('Revisa tu correo para confirmar la cuenta. Si ya tienes una, puedes iniciar sesión o recuperar tu contraseña.')
      }
      if (mode === 'forgot') {
        setSuccessMsg('Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso. Revisa también la carpeta de spam.')
      }
      if (mode === 'recovery') {
        setPasswordUpdated(true)
        setSuccessMsg('Tu contraseña se actualizó correctamente.')
      }
    } catch (error) {
      setErrorMsg(getAuthErrorMessage(error))
    } finally {
      requestPending.current = false
      setBusy(false)
    }
  }

  async function cancelRecovery() {
    if (requestPending.current) return
    requestPending.current = true
    setBusy(true)
    setErrorMsg('')
    try {
      const { error } = await signOut()
      if (error) throw error
    } catch (error) {
      setErrorMsg(getAuthErrorMessage(error))
    } finally {
      requestPending.current = false
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      <aside className="wellness-panel" aria-label="Bienvenido a Control Farmacia">
        <p className="eyebrow"><MedicalIcon name="pulse" /> Bienestar, todos los días</p>
        <h2>Cuidarte empieza<br />por <em>ti.</em></h2>
        <p className="wellness-description">Un espacio personal, sencillo y cercano. Porque tu bienestar merece un lugar en tu día.</p>
        <WellnessVisual />
        <div className="wellness-bottom"><MedicalIcon name="heart" /><p><strong>Pequeños pasos, más tranquilidad.</strong>Siempre a tu ritmo.</p></div>
      </aside>
      <main className="auth-container" id="contenido" tabIndex={-1}>
      <header className="auth-header">
        <p className="auth-brand"><MedicalIcon name="user" /> Tu espacio personal</p>
        <h1>{passwordUpdated ? 'Contraseña actualizada' : titles[mode]}</h1>
        <p>{mode === 'forgot' ? 'Te enviaremos un enlace para elegir una nueva contraseña.' :
          mode === 'recovery' ? 'Elige una contraseña que no uses en otras cuentas.' :
          'Tu espacio para el control personal de tus tratamientos.'}</p>
      </header>

      {(errorMsg || authError) && (
        <div className="auth-alert auth-alert-error" role="alert">{errorMsg || authError}</div>
      )}
      {successMsg && <div className="auth-alert auth-alert-success" role="status">{successMsg}</div>}

      {passwordUpdated ? (
        <button className="btn-primary" type="button" onClick={finishRecovery}>Continuar a mi cuenta</button>
      ) : (
        <form key={mode} onSubmit={handleSubmit} aria-label={titles[mode]} aria-busy={busy}>
          <fieldset className="auth-form" disabled={busy}>
            <legend className="sr-only">{titles[mode]}</legend>
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="full-name">Nombre (opcional)</label>
                <input id="full-name" name="fullName" autoComplete="name" maxLength={100}
                  value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
            )}

            {mode !== 'recovery' && (
              <div className="form-group">
                <label htmlFor="email">Correo electrónico</label>
                <input id="email" name="email" type="email" required autoComplete="email"
                  autoCapitalize="none" spellCheck={false} placeholder="tu@correo.com"
                  value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="form-group">
                <label htmlFor="password">{mode === 'recovery' ? 'Nueva contraseña' : 'Contraseña'}</label>
                <input id="password" name="password" type="password" required
                  autoComplete={createsPassword ? 'new-password' : 'current-password'}
                  aria-describedby={createsPassword ? 'password-hint' : undefined}
                  value={password} onChange={(event) => setPassword(event.target.value)} />
                {createsPassword && <p id="password-hint" className="form-hint">Al menos {MIN_PASSWORD_LENGTH} caracteres. Usa una contraseña larga y única.</p>}
              </div>
            )}

            {createsPassword && (
              <div className="form-group">
                <label htmlFor="confirm-password">Confirmar contraseña</label>
                <input id="confirm-password" name="confirmPassword" type="password" required
                  autoComplete="new-password" value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
            )}

            <button type="submit" className="btn-primary">{actions[mode][busy ? 1 : 0]}</button>

            <nav className="auth-footer" aria-label="Opciones de acceso">
              {mode === 'login' ? (
                <>
                  <button type="button" className="auth-link" onClick={() => changeMode('forgot')}>¿Olvidaste tu contraseña?</button>
                  <span>¿No tienes cuenta? <button type="button" className="auth-link" onClick={() => changeMode('register')}>Crear cuenta</button></span>
                </>
              ) : mode === 'recovery' ? (
                <button type="button" className="auth-link" onClick={cancelRecovery}>Cancelar y cerrar sesión</button>
              ) : (
                <button type="button" className="auth-link" onClick={() => changeMode('login')}>Volver a iniciar sesión</button>
              )}
            </nav>
          </fieldset>
        </form>
      )}
      <p className="auth-footnote"><MedicalIcon name="heart" /> Un pequeño paso para cuidar de ti.</p>
      </main>
    </div>
  )
}
