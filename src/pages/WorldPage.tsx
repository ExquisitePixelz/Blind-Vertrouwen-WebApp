import { Link } from 'react-router'
import { TopBar } from '../components/TopBar'
import { WORLD_KINDS } from '../lib/world'

/**
 * World (ARCHITECTURE.md 1.13, 1.14): the lore of Theros, as full-width
 * buttons like the dashboard: NPCs, Places, Factions, Lore, Creatures, Items.
 */
export function WorldPage() {
  return (
    <main className="page dashboard">
      <TopBar title="World" back="/" />
      <nav className="dash-buttons">
        <Link className="dash-button" to="/world/npcs">
          NPCs
        </Link>
        {WORLD_KINDS.map((k) => (
          <Link key={k.kind} className="dash-button" to={`/world/${k.segment}`}>
            {k.plural}
          </Link>
        ))}
      </nav>
    </main>
  )
}
