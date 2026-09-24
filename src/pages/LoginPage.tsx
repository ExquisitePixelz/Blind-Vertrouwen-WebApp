import { signIn } from '../lib/supabase'

export function LoginPage({ message }: { message?: string }) {
  return (
    <main className="page center">
      <h1>Theros DM Companion</h1>
      <p className="muted">{message ?? 'Characters, gods and piety for our Theros campaigns.'}</p>
      <button onClick={() => signIn()}>Log in with Google</button>
    </main>
  )
}
