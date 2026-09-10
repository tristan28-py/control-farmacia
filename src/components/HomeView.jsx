import { MedicalIcon } from './MedicalIcon'
import { WellnessVisual } from './WellnessVisual'
import { useRef, useState } from 'react'
import { ProfileForm } from './ProfileForm'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../lib/authMessages'

export function HomeView() {
  const { user, signOut, authError } = useAuth()
  const [profileName, setProfileName] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const requestPending = useRef(false)
  const displayName = (profileName ?? user?.user_metadata?.full_name)?.trim() || user?.email?.split('@')[0] || 'Usuario'

  async function handleSignOut() {
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
    <main className="account-container" id="contenido" tabIndex={-1}>
      <header className="account-header">
        <div>
          <p className="auth-brand"><MedicalIcon name="pulse" /> Mi espacio personal</p>
          <h1>Hola, {displayName}</h1>
<p className="account-subtitle">Qué bueno tenerte aquí. Este espacio es tuyo.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={handleSignOut} disabled={busy}>
          {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </header>
      {(errorMsg || authError) && (
        <p className="auth-alert auth-alert-error" role="alert">{errorMsg || authError}</p>
      )}
      <div className="account-layout">
        <ProfileForm onProfileChange={setProfileName} />
        <aside className="account-note">
          <WellnessVisual />
          <p className="eyebrow">Un momento para ti</p>
          <h2>Tu bienestar comienza contigo.</h2>
          <p>Los pequeños pasos también cuentan. Haz de este espacio un lugar que se sienta tuyo.</p>
        </aside>
      </div>
    </main>
  )
}
