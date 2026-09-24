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
