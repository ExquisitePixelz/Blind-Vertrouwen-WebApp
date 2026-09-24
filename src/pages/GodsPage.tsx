import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PromptDialog } from '../components/Dialog'
import { TopBar } from '../components/TopBar'
import { loadGods, slugify } from '../lib/gods'
import { useMe } from '../lib/me'
import { NEUTRAL, standing } from '../lib/standing'
import { supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

/** God list (1.3 C5). Everyone in a campaign reads; the DM can add gods. */
export function GodsPage() {
  const me = useMe()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const gods = useLoad(loadGods, [])

  return (
    <main className="page">
      <TopBar title="Gods" back="/">
        {me.isDm && (
          <button className="icon" aria-label="New god" onClick={() => setCreating(true)}>
            +
          </button>
        )}
      </TopBar>

      {gods.error && <p className="error">{gods.error}</p>}
      {gods.data?.length === 0 && <p className="muted">The gods appear once you have joined a campaign.</p>}
      <ul className="list">
        {gods.data?.map((god) => {
          const attitude = standing(god.party_attitude)
          const facts = [god.alignment, god.domains, god.symbol].filter(Boolean).join(' · ')
          return (
            <li key={god.id}>
              <Link to={`/gods/${god.slug}`} className="row">
                <strong>{god.name}</strong>
                {attitude.value !== NEUTRAL && (
                  <span className="chip" style={{ color: attitude.text, marginLeft: '0.5rem' }}>
                    {attitude.label}
                  </span>
                )}
                {god.epithet && <div>{god.epithet}</div>}
                {facts && <div className="muted small">{facts}</div>}
              </Link>
            </li>
          )
        })}
      </ul>

      {creating && (
        <PromptDialog
          title="New god"
          submitLabel="Create"
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            let slug = slugify(name)
            for (let attempt = 0; attempt < 5; attempt++) {
              const result = await supabase.from('gods').insert({ world_id: me.worldId, slug, name }).select('slug').single()
              if (!result.error) {
                navigate(`/gods/${(result.data as { slug: string }).slug}`)
                return
              }
              if (result.error.code !== '23505') throw new Error(result.error.message)
              slug = `${slugify(name)}-${attempt + 2}` // name taken: nylea-2, nylea-3, …
            }
            throw new Error('Could not find a free id for this god.')
          }}
        />
      )}
    </main>
  )
}
