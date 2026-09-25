import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { googleClientId, renderGoogleButton } from '../lib/googleSignIn'
import { clearLoginNotice, readLoginNotice } from '../lib/access'
import { signIn } from '../lib/supabase'

export function LoginPage({ message }: { message?: string }) {
  const [notice] = useState(readLoginNotice)
  useEffect(clearLoginNotice, [])
  return (
    <main className="page center">
      <h1>Theros DM Companion</h1>
      <p className="muted">{message ?? 'Characters, gods and piety for our Theros campaigns.'}</p>
      {notice && <p className="notice">{notice}</p>}
      {googleClientId ? <GoogleButton /> : <button onClick={() => signIn()}>Log in with Google</button>}
      <p className="small">
        <Link to="/privacy" className="muted">
          Privacy policy
        </Link>
      </p>
    </main>
  )
}

/**
 * Google's own button (1.5). If Google's script cannot load (for example it
 * is blocked), fall back to the plain redirect login so nobody is locked out.
 */
function GoogleButton() {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    renderGoogleButton(ref.current, setError).catch(() => setFailed(true))
  }, [])

  if (failed) return <button onClick={() => signIn()}>Log in with Google</button>
  return (
    <>
      <div ref={ref} className="google-button" />
      {error && <p className="error">{error}</p>}
    </>
  )
}
