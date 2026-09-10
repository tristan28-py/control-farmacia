import { useEffect, useState } from 'react'
import { MedicalIcon } from './MedicalIcon'

export function SiteFrame({ children }) {
  const [motionEnabled, setMotionEnabled] = useState(() =>
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = (event) => setMotionEnabled(!event.matches)
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  return (
    <div className="site-shell" data-motion={motionEnabled ? 'on' : 'paused'}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <div className="brand">
          <span className="brand-symbol"><MedicalIcon /></span>
          <span>Control<span className="brand-second">Farmacia</span></span>
        </div>
        <p className="header-note"><MedicalIcon name="heart" /> Un espacio para cuidarte</p>
      </header>
      <div className="site-content">{children}</div>
      <footer className="site-footer">
        <p>Tu bienestar, a tu ritmo.</p>
        <button className="motion-toggle" type="button" aria-pressed={motionEnabled}
          onClick={() => setMotionEnabled((enabled) => !enabled)}>
          <MedicalIcon name={motionEnabled ? 'pause' : 'play'} />
          {motionEnabled ? 'Pausar animaciones' : 'Activar animaciones'}
        </button>
      </footer>
    </div>
  )
}
