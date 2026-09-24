import { Link, NavLink, useMatch } from 'react-router'
import { lastCampaign } from '../lib/lastCampaign'
import { useMe } from '../lib/me'
import { supabase } from '../lib/supabase'

export function Header() {
  const me = useMe()
  // Piety belongs to a campaign: the one on screen, else the last one opened.
  const inCampaign = useMatch('/c/:campaignId/*')?.params.campaignId
  const pietyCampaign = inCampaign ?? lastCampaign()
  return (
    <header className="header">
      <nav className="nav">
        <Link to="/" className="brand">
          Theros
        </Link>
        <NavLink to="/gods">Gods</NavLink>
        {pietyCampaign && <NavLink to={`/c/${pietyCampaign}/piety`}>Piety</NavLink>}
      </nav>
      <span className="header-user">
        <span className="header-name">{me.name}</span>
        {me.isDm && <span className="chip gold">DM</span>}
        <button className="link" onClick={() => supabase.auth.signOut()}>
          Log out
        </button>
      </span>
    </header>
  )
}
