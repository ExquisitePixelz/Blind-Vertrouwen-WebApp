import { startTransition, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** The current login session: undefined while loading, null when logged out. */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // A transition: the start screen stays until the next screen's file has
    // loaded, without React's 300 ms hold-back after a placeholder (1.11 A1).
    const set = (s: Session | null) => startTransition(() => setSession(s))
    supabase.auth.getSession().then(({ data }) => set(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => set(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return session
}
