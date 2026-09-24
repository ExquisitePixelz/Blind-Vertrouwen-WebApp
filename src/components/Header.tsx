import { Link } from 'react-router'
import { useMe } from '../lib/me'
import { supabase } from '../lib/supabase'

export function Header() {
  const me = useMe()
  return (
    <header className="header">
      <Link to="/" className="brand">
        Theros
      </Link>
      <span className="header-user">
        {me.name}
        {me.isDm && <span className="chip gold">DM</span>}
        <button className="link" onClick={() => supabase.auth.signOut()}>
          Log out
        </button>
      </span>
    </header>
  )
}
