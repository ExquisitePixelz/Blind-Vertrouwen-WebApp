// Invite-only access (ARCHITECTURE.md 1.6). Only the DM and people who joined
// a campaign with an invite link are let in; anyone else is signed out with a
// message. The database decides (check_access), and row-level security stays
// the real lock either way.

import { must, supabase } from './supabase'

const NOTICE_KEY = 'theros:loginNotice'

export const INVITE_ONLY = 'This site is invite-only. Ask the DM for an invite link.'

/** True when the logged-in user may use the site. Deletes a stranger's empty account. */
export async function checkAccess(): Promise<boolean> {
  return must(await supabase.rpc('check_access')) as boolean
}

/** Sign out and show `message` on the login page. */
export async function signOutWith(message: string) {
  try {
    sessionStorage.setItem(NOTICE_KEY, message)
  } catch {
    // Storage blocked: the login page shows its usual text instead.
  }
  // Local only: the account may already be deleted on the server.
  await supabase.auth.signOut({ scope: 'local' })
}

/** The message left by signOutWith. */
export function readLoginNotice(): string | null {
  try {
    return sessionStorage.getItem(NOTICE_KEY)
  } catch {
    return null
  }
}

/** Show the message once: clear it after the login page has read it. */
export function clearLoginNotice() {
  try {
    sessionStorage.removeItem(NOTICE_KEY)
  } catch {
    // ignore
  }
}
