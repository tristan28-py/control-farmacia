import { useEffect, useState } from 'react'

const key = 'control-farmacia:motion'
const query = '(prefers-reduced-motion: reduce)'

export function useMotionPreference() {
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem(key) === 'paused' } catch { return false }
  })
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  function toggleMotion() {
    const next = !paused
    setPaused(next)
    try { localStorage.setItem(key, next ? 'paused' : 'on') } catch { /* La UI funciona sin almacenamiento. */ }
  }

  return { motionEnabled: !paused && !reduced, reduced, toggleMotion }
}
