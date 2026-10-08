import { useState } from 'react'
import { Dialog } from './Dialog'
import type { GodName } from '../lib/gods'
import { NAME_MAX } from '../lib/limits'
import { MarkdownNotes } from './MarkdownNotes'
import { faithParams, faithReady, type Faith } from '../lib/faith'
import { supabase } from '../lib/supabase'

const CUSTOM = 'custom'
const NONE = 'none'

/**
 * The god list with "Custom faith…" and "None"; a custom faith shows its name
 * and how it works. `customStart` fills those in when the player picks it.
 */
export function FaithFields({
  gods,
  value,
  onChange,
  customStart = { name: '', rules: '' },
}: {
  gods: GodName[]
  value: Faith | null
  onChange: (faith: Faith) => void
  customStart?: { name: string; rules: string }
}) {
  const selected = value === null ? '' : value.kind === 'god' ? value.godId : value.kind === 'custom' ? CUSTOM : NONE

  return (
    <>
      <label className="field">
        <span className="muted small">God</span>
        <select
          className="text-input"
          value={selected}
          onChange={(e) => {
            const next = e.target.value
            if (next === CUSTOM) onChange({ kind: 'custom', ...customStart })
            else if (next === NONE) onChange({ kind: 'none' })
            else onChange({ kind: 'god', godId: next })
          }}
        >
          <option value="" disabled>
            Choose…
          </option>
          {gods.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {g.epithet ? `, ${g.epithet}` : ''}
            </option>
          ))}
          <option value={CUSTOM}>Custom faith…</option>
          <option value={NONE}>None</option>
        </select>
      </label>
      {value?.kind === 'custom' && (
        <>
          <label className="field">
            <span className="muted small">Name, e.g. Oracle</span>
            <input
              className="text-input"
              value={value.name}
              maxLength={NAME_MAX}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </label>
          <MarkdownNotes
            title="How it works"
            notes={value.rules}
            onChange={(rules) => onChange({ ...value, rules })}
            onBlur={() => {}}
            placeholder="How this character gains piety…"
            emptyText="Nothing written yet."
          />
        </>
      )}
    </>
  )
}

/**
 * Change a character's faith (1.1, 2026-10-08). The faith they leave keeps
 * its score as a former track; going back to it brings that score back.
 */
export function ChangeFaithDialog({
  characterId,
  gods,
  current,
  customStart,
  onSaved,
  onClose,
}: {
  characterId: string
  gods: GodName[]
  current: Faith | null
  customStart?: { name: string; rules: string }
  onSaved: () => void
  onClose: () => void
}) {
  const [faith, setFaith] = useState<Faith | null>(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = faithReady(faith) && !busy

  return (
    <Dialog title="Devoted to" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!ready || !faith) return
          setBusy(true)
          setError(null)
          const result = await supabase.rpc('change_faith', { p_character_id: characterId, ...faithParams(faith) })
          if (result.error) {
            setError(result.error.message)
            setBusy(false)
            return
          }
          onSaved()
          onClose()
        }}
      >
        <FaithFields gods={gods} value={faith} onChange={setFaith} customStart={customStart} />
        <p className="muted small">
          A faith you leave keeps its piety. Choosing it again later brings that piety back.
        </p>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={!ready}>
            Save
          </button>
        </div>
      </form>
    </Dialog>
  )
}
