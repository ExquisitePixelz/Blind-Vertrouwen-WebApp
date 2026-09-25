import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { consumeMailToken, setNewPassword } from '../lib/emailAuth'
import { supabase } from '../lib/supabase'
import { passwordProblem } from '../lib/validate'
import { AuthForm, NewPasswordFields } from './LoginPage'

/**
 * /reset-password, opened from the reset mail (ARCHITECTURE.md 1.7). The
 * mail's token logs the user in; then they choose a new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<'checking' | 'ready' | 'failed'>('checking')
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await consumeMailToken()
        const { data } = await supabase.auth.getSession()
        if (!cancelled) setState(data.session ? 'ready' : 'failed')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setState('failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="page center login">
      <h1>New password</h1>
      {state === 'checking' && <p className="muted">Checking your link…</p>}
      {state === 'failed' && (
        <>
          <p className="notice">{error ?? 'This link has expired or was already used.'}</p>
          <p>
            <Link to="/" className="gold">
              Ask for a new reset mail
            </Link>
          </p>
        </>
      )}
      {state === 'ready' && (
        <AuthForm
          submitLabel="Save new password"
          check={() => passwordProblem(password, repeat)}
          onSubmit={async () => {
            await setNewPassword(password)
            navigate('/', { replace: true })
          }}
        >
          <NewPasswordFields password={password} repeat={repeat} setPassword={setPassword} setRepeat={setRepeat} />
        </AuthForm>
      )}
    </main>
  )
}
