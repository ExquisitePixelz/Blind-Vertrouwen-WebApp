import { Link, NavLink } from 'react-router'
import { useMe } from '../lib/me'
import { supabase } from '../lib/supabase'

export function Header() {
  const me = useMe()
  return (
    <header className="header">
      <nav className="nav">
        <Link to="/" className="brand">
          Theros
        </Link>
        <NavLink to="/gods">Gods</NavLink>
      </nav>
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
