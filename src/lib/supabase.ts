import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example).')
}

// Publishable key only: safe in the browser because RLS guards every table.
export const supabase = createClient(url, key, {
  auth: { flowType: 'pkce' },
})

/** Unwrap a Supabase result: return the data, or throw its error message. */
export function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

/** Start Google login, and come back to `returnPath` (e.g. an invite link) afterwards. */
export function signIn(returnPath = window.location.pathname) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + returnPath },
  })
}
