import { useState } from 'react'

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button type="button" className="auth-link" aria-controls={props.id}
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${props.id === 'confirm-password' ? 'confirmación de contraseña' : 'contraseña'}`}
        onClick={() => setVisible((value) => !value)}>
        {visible ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}
