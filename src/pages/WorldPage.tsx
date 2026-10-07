import { Link } from 'react-router'
import { TopBar } from '../components/TopBar'

/**
 * World (ARCHITECTURE.md 1.13): the lore of Theros, as full-width buttons
 * like the dashboard. Phase 11 has NPCs; places, towns and factions come
 * here later (roadmap).
 */
export function WorldPage() {
  return (
    <main className="page dashboard">
      <TopBar title="World" back="/" />
      <nav className="dash-buttons">
        <Link className="dash-button" to="/world/npcs">
          NPCs
        </Link>
      </nav>
    </main>
  )
}
