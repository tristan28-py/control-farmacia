import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [estado, setEstado] = useState('Probando conexión...')

  useEffect(() => {
    async function probarConexion() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error(error)
        setEstado('❌ Error conectando con Supabase')
      } else {
        console.log('Conexión correcta:', data)
        setEstado('✅ Supabase conectado correctamente')
      }
    }

    probarConexion()
  }, [])

  return (
    <div>
      <h1>{estado}</h1>
    </div>
  )
}

export default App