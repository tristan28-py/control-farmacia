import { SiteFrame } from './components/SiteFrame'
import { MedicalIcon } from './components/MedicalIcon'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { AuthView } from './components/auth/AuthView'
import { HomeView } from './components/HomeView'
import { isSupabaseConfigured } from './lib/supabase'
import './components/auth/auth.css'

function MainContent() {
  const { user, loading, isRecoveryMode } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <main className="auth-container" id="contenido" tabIndex={-1}>
        <h1>Acceso no disponible</h1>
        <p role="alert">El acceso a las cuentas no está disponible en este momento. Inténtalo más tarde.</p>
      </main>
    )
  }

  if (loading) {
    return <main className="session-loading" id="contenido" tabIndex={-1} role="status"><span className="brand-symbol"><MedicalIcon /></span>Cargando sesión…</main>
  }

  if (isRecoveryMode || !user) {
    // Un enlace de recuperación abre un formulario nuevo, sin contraseñas anteriores.
    return <AuthView key={isRecoveryMode ? 'recovery' : 'access'} />
  }

  return <HomeView key={user.id} />
}

export default function App() {
  return <AuthProvider><SiteFrame><MainContent /></SiteFrame></AuthProvider>
}
