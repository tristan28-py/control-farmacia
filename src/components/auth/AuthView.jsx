import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './auth.css'

export function AuthView() {
  const {
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    isRecoveryMode,
    setIsRecoveryMode,
  } = useAuth()

  // Modos de vista: 'login' | 'register' | 'forgot' | 'recovery'
  const [mode, setMode] = useState(isRecoveryMode ? 'recovery' : 'login')

  // Campos de formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')

  // Estados de control
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Limpiar mensajes y estados al cambiar de modo
  const changeMode = (newMode) => {
    setMode(newMode)
    setErrorMsg('')
    setSuccessMsg('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setErrorMsg(error.message || 'Credenciales inválidas')
      }
    } catch (err) {
      setErrorMsg('Error inesperado al iniciar sesión: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await signUp(email, password, {
        full_name: fullName.trim(),
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        // En Supabase, si la confirmación por correo está habilitada, data.session es null
        if (!data.session) {
          setSuccessMsg(
            '¡Registro exitoso! Por favor revisa tu bandeja de correo para confirmar tu cuenta.'
          )
        } else {
          setSuccessMsg('¡Registro exitoso! Iniciando sesión...')
        }
      }
    } catch (err) {
      setErrorMsg('Error al registrar usuario: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const { error } = await resetPassword(email)
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg(
          'Se ha enviado un enlace de recuperación a tu correo electrónico.'
        )
      }
    } catch (err) {
      setErrorMsg('Error al solicitar recuperación: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (password.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const { error } = await updatePassword(password)
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('¡Contraseña actualizada exitosamente!')
        setTimeout(() => {
          setIsRecoveryMode(false)
          changeMode('login')
        }, 2000)
      }
    } catch (err) {
      setErrorMsg('Error al actualizar la contraseña: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Control Farmacia</h2>
        <p>
          {mode === 'login' && 'Ingresa tus credenciales para continuar'}
          {mode === 'register' && 'Crea tu cuenta de control personal'}
          {mode === 'forgot' && 'Recupera el acceso a tu cuenta'}
          {mode === 'recovery' && 'Ingresa tu nueva contraseña'}
        </p>
      </div>

      {errorMsg && <div className="auth-alert auth-alert-error">{errorMsg}</div>}
      {successMsg && (
        <div className="auth-alert auth-alert-success">{successMsg}</div>
      )}

      {/* FORMULARIO: LOGIN */}
      {mode === 'login' && !isRecoveryMode && (
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>

          <div className="auth-footer">
            <button
              type="button"
              className="auth-link"
              onClick={() => changeMode('forgot')}
            >
              ¿Olvidaste tu contraseña?
            </button>
            <span>
              ¿No tienes una cuenta?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => changeMode('register')}
              >
                Regístrate
              </button>
            </span>
          </div>
        </form>
      )}

      {/* FORMULARIO: REGISTRO */}
      {mode === 'register' && !isRecoveryMode && (
        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label htmlFor="reg-name">Nombre Completo</label>
            <input
              id="reg-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Correo Electrónico</label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm">Confirmar Contraseña</label>
            <input
              id="reg-confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>

          <div className="auth-footer">
            <span>
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => changeMode('login')}
              >
                Inicia Sesión
              </button>
            </span>
          </div>
        </form>
      )}

      {/* FORMULARIO: RECUPERAR CONTRASEÑA */}
      {mode === 'forgot' && !isRecoveryMode && (
        <form onSubmit={handleForgotPassword} className="auth-form">
          <div className="form-group">
            <label htmlFor="forgot-email">Correo Electrónico</label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>

          <div className="auth-footer">
            <button
              type="button"
              className="auth-link"
              onClick={() => changeMode('login')}
            >
              Volver a Iniciar Sesión
            </button>
          </div>
        </form>
      )}

      {/* FORMULARIO: NUEVA CONTRASEÑA (RECOVERY MODE) */}
      {(mode === 'recovery' || isRecoveryMode) && (
        <form onSubmit={handleUpdatePassword} className="auth-form">
          <div className="form-group">
            <label htmlFor="new-password">Nueva Contraseña</label>
            <input
              id="new-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-new-password">Confirmar Nueva Contraseña</label>
            <input
              id="confirm-new-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Establecer Nueva Contraseña'}
          </button>
        </form>
      )}
    </div>
  )
}
