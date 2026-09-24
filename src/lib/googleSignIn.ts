// Google's own sign-in button (Google Identity Services), ARCHITECTURE.md 1.5.
// The Google window then opens from dnd.yannickmul.nl instead of saying
// "continue to <project>.supabase.co". Google hands us an ID token, which
// Supabase turns into a login session with signInWithIdToken.
//
// The nonce: Google puts the SHA-256 of a random value into the token, and
// Supabase checks it against the raw value, so a stolen token cannot be replayed.

import { supabase } from './supabase'

/** The OAuth client ID from the Google Cloud console. Public, like the publishable key. */
export const googleClientId: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined

type CredentialResponse = { credential: string }
type Gsi = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string
        callback: (response: CredentialResponse) => void
        nonce: string
        ux_mode?: 'popup'
        itp_support?: boolean
      }): void
      renderButton(parent: HTMLElement, options: Record<string, string | number>): void
    }
  }
}

let script: Promise<Gsi> | null = null

function loadGsi(): Promise<Gsi> {
  script ??= new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = 'https://accounts.google.com/gsi/client'
    tag.async = true
    tag.onload = () => resolve((window as unknown as { google: Gsi }).google)
    tag.onerror = () => {
      script = null
      reject(new Error('Could not load Google sign-in. Check your connection and try again.'))
    }
    document.head.appendChild(tag)
  })
  return script
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '')
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Draw Google's button into `parent`. Tapping it logs in; errors go to `onError`. */
export async function renderGoogleButton(parent: HTMLElement, onError: (message: string) => void) {
  if (!googleClientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set.')
  const gsi = await loadGsi()
  const nonce = randomNonce()
  gsi.accounts.id.initialize({
    client_id: googleClientId,
    nonce: await sha256Hex(nonce),
    ux_mode: 'popup',
    itp_support: true,
    callback: async ({ credential }) => {
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce })
      if (error) onError(error.message)
    },
  })
  gsi.accounts.id.renderButton(parent, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    logo_alignment: 'left',
    width: Math.min(320, parent.clientWidth || 320),
  })
}
