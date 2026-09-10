import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const profileColumns = 'id, full_name, created_at, updated_at'

export function ProfileForm({ onProfileChange }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const saveRequest = useRef(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfile() {
      try {
        const { data, error } = await supabase.from('profiles')
          .select(profileColumns)
          .eq('id', user.id)
          .abortSignal(controller.signal)
          .maybeSingle()

        if (controller.signal.aborted) return
        if (error) throw error
        if (!data) {
          setErrorMsg('Tu perfil todavía no está disponible. Intenta de nuevo o contacta con soporte.')
          return
        }
        setProfile(data)
        setFullName(data.full_name ?? '')
        onProfileChange(data.full_name ?? '')
      } catch {
        if (!controller.signal.aborted) {
          setErrorMsg('No pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      controller.abort()
      saveRequest.current?.abort()
    }
  }, [user.id, loadAttempt, onProfileChange])

  function retryLoad() {
    setLoading(true)
    setErrorMsg('')
    setLoadAttempt((attempt) => attempt + 1)
  }

  async function handleSave(event) {
    event.preventDefault()
    if (saveRequest.current || !profile) return
    const name = fullName.trim()
    setErrorMsg('')
    setSuccessMsg('')

    if (name.length > 100) {
      setErrorMsg('El nombre debe tener como máximo 100 caracteres.')
      return
    }

    const controller = new AbortController()
    saveRequest.current = controller
    setSaving(true)
    try {
      // El id procede de Auth; solo se envía el campo editable.
      // RLS vuelve a comprobar la identidad en PostgreSQL.
      const { data, error } = await supabase.from('profiles')
        .update({ full_name: name || null })
        .eq('id', user.id)
        .select(profileColumns)
        .abortSignal(controller.signal)
        .single()

      if (controller.signal.aborted) return
      if (error || !data) {
        setErrorMsg('No pudimos guardar tu perfil. Tus cambios siguen aquí para que puedas reintentarlo.')
        return
      }
      setProfile(data)
      setFullName(data.full_name ?? '')
      onProfileChange(data.full_name ?? '')
      setSuccessMsg('Tu perfil se guardó correctamente.')
    } catch {
      if (!controller.signal.aborted) {
        setErrorMsg('No pudimos guardar tu perfil. Tus cambios siguen aquí para que puedas reintentarlo.')
      }
    } finally {
      saveRequest.current = null
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  return (
    <section className="account-details" aria-labelledby="profile-title">
      <h2 id="profile-title">Tu cuenta</h2>
      <dl>
        <dt>Correo electrónico</dt>
        <dd>{user.email}</dd>
      </dl>

      {loading && <p role="status">Cargando perfil…</p>}
      {errorMsg && <p className="auth-alert auth-alert-error" role="alert">{errorMsg}</p>}
      {successMsg && <p className="auth-alert auth-alert-success" role="status">{successMsg}</p>}

      {!loading && !profile && (
        <button type="button" className="btn-secondary" onClick={retryLoad}>Reintentar carga</button>
      )}

      {!loading && profile && (
        <form onSubmit={handleSave} aria-label="Editar perfil" aria-busy={saving}>
          <fieldset className="auth-form" disabled={saving}>
            <legend className="sr-only">Datos de tu perfil</legend>
            <div className="form-group">
              <label htmlFor="profile-full-name">Nombre completo</label>
              <input id="profile-full-name" name="fullName" autoComplete="name"
                maxLength={100} value={fullName} aria-describedby="profile-name-hint"
                onChange={(event) => {
                  setFullName(event.target.value)
                  setSuccessMsg('')
                }} />
              <p id="profile-name-hint" className="form-hint">Opcional. Hasta 100 caracteres.</p>
            </div>
            <button type="submit" className="btn-primary"
              disabled={saving || fullName.trim() === (profile.full_name ?? '')}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  )
}
