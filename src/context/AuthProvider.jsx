import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  useEffect(() => {
    // 1. Obtener la sesión activa al montar el componente (persistencia)
    async function getInitialSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error al obtener sesión inicial:', error.message)
        } else {
          setSession(data.session)
          setUser(data.session?.user ?? null)
        }
      } catch (err) {
        console.error('Error inesperado al inicializar auth:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 2. Escuchar cambios de estado en tiempo real (login, logout, token refresh, password recovery)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      } else if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        setIsRecoveryMode(false)
      }
    })

    // Limpieza al desmontar
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Métodos de autenticación
  const signUp = async (email, password, metadata = {}) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
  }

  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  const signOut = async () => {
    const res = await supabase.auth.signOut()
    setIsRecoveryMode(false)
    return res
  }

  const resetPassword = async (email) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
  }

  const updatePassword = async (newPassword) => {
    const res = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (!res.error) {
      setIsRecoveryMode(false)
    }
    return res
  }

  const value = {
    user,
    session,
    loading,
    isRecoveryMode,
    setIsRecoveryMode,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
