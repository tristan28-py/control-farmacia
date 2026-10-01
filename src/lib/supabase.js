import { createClient } from '@supabase/supabase-js'
import { readAuthRedirect } from './authRedirect'

// Capturar el tipo de enlace antes de que Supabase procese y limpie la URL.
export const authRedirect = readAuthRedirect()

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
let validUrl = false
try {
  validUrl = /^https?:\/\//i.test(supabaseUrl) && ['https:', 'http:'].includes(new URL(supabaseUrl).protocol)
} catch {
  // Mostrar un estado de configuración en lugar de una pantalla vacía.
}

let client = null
try {
  if (validUrl && supabaseAnonKey) client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
} catch {
  // Los errores de configuración ocurren antes del render: no mostrar detalles internos.
}

export const supabase = client
export const isSupabaseConfigured = Boolean(client)
