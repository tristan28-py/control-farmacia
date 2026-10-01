import { supabase } from '../lib/supabase'

const columns = 'id, full_name, created_at, updated_at'

function unwrap({ data, error, status }) {
  if (error) throw Object.assign(new Error('Profile operation failed'), { code: error.code, status })
  if (!data) throw Object.assign(new Error('Profile unavailable'), { code: 'PROFILE_MISSING' })
  return data
}

export async function getProfile(userId, signal) {
  return unwrap(await supabase.from('profiles').select(columns)
    .eq('id', userId).abortSignal(signal).maybeSingle())
}

export async function updateProfile(userId, fullName, signal) {
  const name = fullName.trim()
  if (name.length > 100) throw new RangeError('El nombre debe tener como máximo 100 caracteres.')
  // Solo el nombre es editable; PostgreSQL impone identidad y permisos mediante RLS.
  return unwrap(await supabase.from('profiles').update({ full_name: name || null })
    .eq('id', userId).select(columns).abortSignal(signal).single())
}
