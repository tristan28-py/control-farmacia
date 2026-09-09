import { useEffect, useState } from 'react'
import { authRedirect, supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/authMessages'
import { getAuthRedirectUrl, setRecoveryLocation } from '../lib/authRedirect'
import { AuthContext } from './AuthContext'

const invalidLinkMessage = 'El enlace no es válido o venció. Solicita un correo nuevo.'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [authError, setAuthError] = useState(authRedirect.error ? invalidLinkMessage : '')

  useEffect(() => {
    if (!supabase) return
    let active = true

    // INITIAL_SESSION también restaura la sesión: evitamos dos lecturas que compitan.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
        setAuthError('')
        setRecoveryLocation(true)
      } else if (event === 'INITIAL_SESSION' && authRedirect.recovery && !authRedirect.error) {
        setIsRecoveryMode(Boolean(nextSession))
        setRecoveryLocation(Boolean(nextSession))
        if (!nextSession) setAuthError(invalidLinkMessage)
      } else if (event === 'SIGNED_OUT') {
        setIsRecoveryMode(false)
        setRecoveryLocation(false)
      } else if (event === 'INITIAL_SESSION' && authRedirect.error) {
        setRecoveryLocation(false)
      }
      // USER_UPDATED no termina la recuperación: primero mostramos la confirmación.
    })

    // initialize() reutiliza la inicialización y permite mostrar sus errores.
    supabase.auth.initialize().then(({ error }) => {
      if (active && error) {
        setAuthError(authRedirect.recovery || authRedirect.error
          ? invalidLinkMessage : getAuthErrorMessage(error))
        setIsRecoveryMode(false)
        setRecoveryLocation(false)
        setLoading(false)
      }
    }).catch((error) => {
      if (active) {
        setAuthError(getAuthErrorMessage(error))
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = (email, password, metadata = {}) => supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: metadata, emailRedirectTo: getAuthRedirectUrl() },
  })

  const signIn = (email, password) => supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  const signOut = async () => {
    try {
      const result = await supabase.auth.signOut({ scope: 'local' })
      // Supabase puede cerrar la sesión local incluso si la petición remota falla.
      if (result.error) {
        setAuthError('No pudimos confirmar el cierre con el servidor. ' + getAuthErrorMessage(result.error))
      }
      return result
    } catch (error) {
      setAuthError(getAuthErrorMessage(error))
      throw error
    }
  }

  const resetPassword = (email) => supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getAuthRedirectUrl(true),
  })

  const updatePassword = (password) => supabase.auth.updateUser({ password })

  const finishRecovery = () => {
    setRecoveryLocation(false)
    setIsRecoveryMode(false)
  }

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      isRecoveryMode,
      authError,
      clearAuthError: () => setAuthError(''),
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      finishRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
