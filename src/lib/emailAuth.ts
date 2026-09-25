// Email and password login (ARCHITECTURE.md 1.7), all through Supabase Auth.
// The mails carry a one-time token (token_hash) instead of a code kept in
// this browser, so the link also works when opened on another device.
// The mail templates in the Supabase dashboard must link to
// {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=... (README).

import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { normalizeEmail, normalizeName } from './validate'

/** Switched on (VITE_EMAIL_LOGIN=true) once mail sending is set up in Supabase (README). */
export const emailLoginEnabled = import.meta.env.VITE_EMAIL_LOGIN === 'true'

/** Create an account from an invite link. The verification mail brings them back to the invite. */
export async function signUpWithEmail(inviteCode: string, email: string, displayName: string, password: string) {
  const { error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: { full_name: normalizeName(displayName), invite_code: inviteCode },
      emailRedirectTo: `${window.location.origin}/invite/${inviteCode}`,
    },
  })
  if (error) throw new Error(friendly(error.message))
}

export async function logInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
  if (error) throw new Error(friendly(error.message))
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw new Error(friendly(error.message))
}

export async function setNewPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(friendly(error.message))
}

/**
 * If this page was opened from a verification or reset mail, log in with its
 * token and remove it from the address bar. Returns false when there was none.
 */
export async function consumeMailToken(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const token_hash = params.get('token_hash')
  const type = params.get('type') as EmailOtpType | null
  if (!token_hash || !type) return false
  window.history.replaceState(null, '', window.location.pathname)
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })
  if (error) throw new Error('This link has expired or was already used. Log in, or ask for a new mail.')
  return true
}

/** Supabase's messages, in the site's words where it helps. */
function friendly(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Wrong email address or password.'
  if (/email not confirmed/i.test(message)) return 'Confirm your email first: click the link in the mail we sent you.'
  if (/rate limit|too many/i.test(message)) return 'Too many tries. Wait a few minutes and try again.'
  if (/weak|should be at least/i.test(message)) return 'Choose a longer password.'
  return message
}
