import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { AuthView } from './components/auth/AuthView'
import { HomeView } from './components/HomeView'

function MainContent() {
  const { user, loading, isRecoveryMode } = useAuth()

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text)' }}>Cargando sesión...</p>
      </div>
    )
  }

  // Si el usuario está en modo recuperación de contraseña, mostramos AuthView (con el formulario de nueva clave)
  if (isRecoveryMode) {
    return <AuthView />
  }

  // Si hay un usuario autenticado, mostramos la vista principal
  if (user) {
    return <HomeView />
  }

  // Si no está autenticado, mostramos el login / registro
  return <AuthView />
}

function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}

export default App