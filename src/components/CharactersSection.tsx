import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Dialog } from './Dialog'
import { byName, loadGods } from '../lib/gods'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type ListRow = {
  id: string
  name: string
  player: string
  class_level: string
  hp_cur: number
  hp_max: number
  ac: number
}

/** Character list (1.3 B3), shown on the campaign page. */
export function CharactersSection({ campaignId }: { campaignId: string }) {
  const [creating, setCreating] = useState(false)
  const characters = useLoad(async () => {
    const rows = must(
      await supabase
        .from('characters')
        .select('id, name, player, class_level, hp_cur, hp_max, ac')
        .eq('campaign_id', campaignId)
        .is('deleted_at', null),
    ) as ListRow[]
    return rows.sort(byName)
  }, [campaignId])

  return (
    <section>
      <div className="title-row">
        <h2>Characters</h2>
        <button className="icon" aria-label="New character" onClick={() => setCreating(true)}>
          +
        </button>
      </div>
      {characters.error && <p className="error">{characters.error}</p>}
      {characters.data?.length === 0 && <p className="muted">No characters yet. Tap + to add one.</p>}
      <ul className="list">
        {characters.data?.map((c) => {
          const second = [c.class_level, c.player].filter(Boolean).join(' · ')
          return (
            <li key={c.id}>
              <Link to={`/c/${campaignId}/characters/${c.id}`} className="row">
                <div className="row-split">
                  <strong>{c.name}</strong>
                  <span className="muted small">
                    HP {c.hp_cur}/{c.hp_max}&nbsp;&nbsp; AC {c.ac}
                  </span>
                </div>
                {second && <div className="muted small">{second}</div>}
              </Link>
            </li>
          )
        })}
      </ul>
      {creating && <NewCharacterDialog campaignId={campaignId} onClose={() => setCreating(false)} />}
    </section>
  )
}

const NO_GOD = 'none'

/**
 * New character: the name, and the god the character believes in. The piety
 * track starts at 0. "No god / other" creates no track; the DM sets up a
 * custom source later (ARCHITECTURE.md 1.1).
 */
function NewCharacterDialog({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const navigate = useNavigate()
  const gods = useLoad(loadGods, [])
  const [name, setName] = useState('')
  const [god, setGod] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = name.trim() !== '' && god !== '' && !busy

  return (
    <Dialog title="New character" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!ready) return
          setBusy(true)
          setError(null)
          const result = await supabase.rpc('create_character', {
            p_campaign_id: campaignId,
            p_name: name.trim(),
            p_god_id: god === NO_GOD ? null : god,
          })
          if (result.error) {
            setError(result.error.message)
            setBusy(false)
            return
          }
          onClose()
          navigate(`/c/${campaignId}/characters/${(result.data as { id: string }).id}`)
        }}
      >
        <label className="field">
          <span className="muted small">Name</span>
          <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span className="muted small">God</span>
          <select className="text-input" value={god} onChange={(e) => setGod(e.target.value)}>
            <option value="" disabled>
              Choose…
            </option>
            {gods.data?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.epithet ? `, ${g.epithet}` : ''}
              </option>
            ))}
            <option value={NO_GOD}>No god / other</option>
          </select>
        </label>
        {god === NO_GOD && (
          <p className="muted small">The DM will set up how this character gains piety.</p>
        )}
        {(error || gods.error) && <p className="error">{error ?? gods.error}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={!ready}>
            Create
          </button>
        </div>
      </form>
    </Dialog>
  )
}
