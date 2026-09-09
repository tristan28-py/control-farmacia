import { useAuth } from '../hooks/useAuth'

export function HomeView() {
  const { user, signOut } = useAuth()

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '40px auto',
        padding: '24px',
        textAlign: 'left',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-h)' }}>
            ¡Hola, {displayName}! 👋
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text)' }}>
            Sesión iniciada como <strong>{user?.email}</strong>
          </p>
        </div>
        <button
          onClick={signOut}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-h)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Cerrar Sesión
        </button>
      </header>

      <section
        style={{
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 8px', color: 'var(--accent)' }}>
          ✅ Fase 1 Completada: Autenticación y Persistencia
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-h)', margin: 0 }}>
          Tu sesión está activa y persistirá aunque recargues la página. Supabase
          Auth está gestionando de forma segura los tokens en el navegador.
        </p>
      </section>

      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '20px',
        }}
      >
        <h4 style={{ margin: '0 0 12px', color: 'var(--text-h)' }}>
          Detalles de la Cuenta
        </h4>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <li>
            <strong>ID de Usuario (auth.uid):</strong>{' '}
            <code style={{ fontSize: '13px' }}>{user?.id}</code>
          </li>
          <li>
            <strong>Email:</strong> {user?.email}
          </li>
          <li>
            <strong>Confirmado:</strong>{' '}
            {user?.email_confirmed_at ? 'Sí' : 'No (o no requerido)'}
          </li>
          <li>
            <strong>Último acceso:</strong>{' '}
            {user?.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleString()
              : 'Reciente'}
          </li>
        </ul>
      </div>
    </div>
  )
}
