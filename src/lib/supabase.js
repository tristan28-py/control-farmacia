import { createClient } from '@supabase/supabase-js'
import { readAuthRedirect } from './authRedirect'

// Capturar el tipo de enlace antes de que Supabase procese y limpie la URL.
export const authRedirect = readAuthRedirect()

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
let validUrl = false
try {
  validUrl = ['https:', 'http:'].includes(new URL(supabaseUrl).protocol)
} catch {
  // Mostrar un estado de configuración en lugar de una pantalla vacía.
}

export const isSupabaseConfigured = Boolean(validUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
