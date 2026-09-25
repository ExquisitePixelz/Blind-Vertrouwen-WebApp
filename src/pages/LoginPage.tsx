import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clearLoginNotice, readLoginNotice } from '../lib/access'
import { emailLoginEnabled, logInWithEmail, sendPasswordReset, signUpWithEmail } from '../lib/emailAuth'
import { googleClientId, renderGoogleButton } from '../lib/googleSignIn'
import { signIn } from '../lib/supabase'
import { emailProblem, nameProblem, passwordProblem, PASSWORD_MIN } from '../lib/validate'

type Mode = 'login' | 'forgot' | 'signup'

/**
 * Logged out. Google, or email and password (ARCHITECTURE.md 1.7). Creating
 * an account is offered only on an invite link (`inviteCode`).
 */
export function LoginPage({ inviteCode, notice: passedNotice }: { inviteCode?: string; notice?: string | null }) {
  const [storedNotice] = useState(readLoginNotice)
  useEffect(clearLoginNotice, [])
  const notice = passedNotice ?? storedNotice
  const [mode, setMode] = useState<Mode>(inviteCode ? 'signup' : 'login')

  return (
    <main className="page center login">
      <h1>Theros DM Companion</h1>
      <p className="muted">
        {inviteCode
          ? 'You have been invited to a Theros campaign. Log in or create an account to join.'
          : 'Characters, gods and piety for our Theros campaigns.'}
      </p>
      {notice && <p className="notice">{notice}</p>}

      {googleClientId ? <GoogleButton /> : <button onClick={() => signIn()}>Log in with Google</button>}
      {emailLoginEnabled && (
        <>
          <p className="or muted small">or with email</p>
          {mode === 'signup' && inviteCode && <SignUpForm inviteCode={inviteCode} />}
          {mode === 'login' && <LogInForm onForgot={() => setMode('forgot')} />}
          {mode === 'forgot' && <ForgotForm />}
        </>
      )}

      <p className="small login-links">
        {emailLoginEnabled && inviteCode && mode === 'signup' && (
          <button type="button" className="link" onClick={() => setMode('login')}>
            I already have an account
          </button>
        )}
        {emailLoginEnabled && inviteCode && mode !== 'signup' && (
          <button type="button" className="link" onClick={() => setMode('signup')}>
            Create an account
          </button>
        )}
        {emailLoginEnabled && !inviteCode && mode === 'forgot' && (
          <button type="button" className="link" onClick={() => setMode('login')}>
            Back to log in
          </button>
        )}
      </p>
    </main>
  )
}

function LogInForm({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return (
    <AuthForm
      submitLabel="Log in"
      check={() => emailProblem(email) ?? (password ? null : 'Enter your password.')}
      onSubmit={() => logInWithEmail(email, password)}
    >
      <Field label="Email">
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <button type="button" className="link forgot" onClick={onForgot}>
        Forgot password?
      </button>
    </AuthForm>
  )
}

function ForgotForm() {
  const [email, setEmail] = useState('')
  return (
    <AuthForm
      submitLabel="Send reset mail"
      done="If there is an account for this address, a mail with a reset link is on its way. Check your spam folder too."
      check={() => emailProblem(email)}
      onSubmit={() => sendPasswordReset(email)}
    >
      <Field label="Email">
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
    </AuthForm>
  )
}

function SignUpForm({ inviteCode }: { inviteCode: string }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  return (
    <AuthForm
      submitLabel="Create account"
      done="Almost there: we sent you a mail. Click the link in it to confirm your address and join the campaign. Check your spam folder too."
      check={() => emailProblem(email) ?? nameProblem(name) ?? passwordProblem(password, repeat)}
      onSubmit={() => signUpWithEmail(inviteCode, email, name, password)}
    >
      <Field label="Email">
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Display name" hint="The name the DM and the other players see.">
        <input autoComplete="nickname" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <NewPasswordFields password={password} repeat={repeat} setPassword={setPassword} setRepeat={setRepeat} />
    </AuthForm>
  )
}

export function NewPasswordFields({
  password,
  repeat,
  setPassword,
  setRepeat,
}: {
  password: string
  repeat: string
  setPassword: (value: string) => void
  setRepeat: (value: string) => void
}) {
  return (
    <>
      <Field label="Password" hint={`At least ${PASSWORD_MIN} characters.`}>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Password again">
        <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      </Field>
    </>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field auth-field">
      <span className="muted small">{label}</span>
      {children}
      {hint && <span className="muted small">{hint}</span>}
    </label>
  )
}

/** A form that checks itself first, shows the server's error, and optionally a "done" message. */
export function AuthForm({
  submitLabel,
  done,
  check,
  onSubmit,
  children,
}: {
  submitLabel: string
  done?: string
  check: () => string | null
  onSubmit: () => Promise<void>
  children: ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  if (finished && done) return <p className="notice">{done}</p>

  return (
    <form
      className="auth-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault()
        const problem = check()
        setError(problem)
        if (problem) return
        setBusy(true)
        try {
          await onSubmit()
          setFinished(true)
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
        }
        setBusy(false)
      }}
    >
      {children}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {submitLabel}
      </button>
    </form>
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
