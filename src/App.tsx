import { supabase } from './supabase'
import { UpdatePrompt } from './UpdatePrompt'
import { useSession } from './useSession'

function signIn() {
  // Come back to the same page (e.g. an invite link) after logging in.
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  })
}

export default function App() {
  const session = useSession()
  const name = session?.user.user_metadata.full_name ?? session?.user.email

  return (
    <main className="page">
      <h1>Theros DM Companion</h1>
      {session === undefined ? null : session ? (
        <>
          <p>Logged in as {name}.</p>
          <button onClick={() => supabase.auth.signOut()}>Log out</button>
        </>
      ) : (
        <button onClick={signIn}>Log in with Google</button>
      )}
      <UpdatePrompt />
    </main>
  )
}
