import { useState } from 'react'
import { Dialog } from './Dialog'
import { fold } from '../lib/npcs'
import { NAME_MAX } from '../lib/limits'

type Option = { id: string; name: string }

/**
 * Pick a world entry from a long list (1.14): a filter box on top, then the
 * matches by name. "None" clears the choice (shown when there is one; pass ""
 * for a choice that is only text). With `onCreate`, a name that is
 * not in the list can be created and picked at once.
 */
export function EntryPickDialog<O extends Option>({
  title,
  options,
  currentId,
  onPick,
  onCreate,
  onClose,
}: {
  title: string
  options: O[]
  currentId: string | null
  onPick: (option: O | null) => void
  /** Create a new entry with this name; the dialog then picks it. */
  onCreate?: (name: string) => Promise<O>
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const typed = text.trim()
  const matches = options.filter((o) => fold(o.name).includes(fold(typed)))
  const exact = options.some((o) => fold(o.name) === fold(typed))

  function pick(option: O | null) {
    onPick(option)
    onClose()
  }

  async function create() {
    if (!onCreate || !typed) return
    setBusy(true)
    setError(null)
    try {
      pick(await onCreate(typed))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (onCreate && typed && !exact) void create()
          else if (matches.length === 1) pick(matches[0])
        }}
      >
        <input
          className="text-input"
          value={text}
          maxLength={NAME_MAX}
          placeholder={onCreate ? 'Filter, or type a new name' : 'Filter'}
          aria-label={onCreate ? 'Filter, or type a new name' : 'Filter'}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        {onCreate && typed && !exact && (
          <button type="submit" className="small-button pick-create" disabled={busy}>
            Create “{typed}”
          </button>
        )}
      </form>
      {error && <p className="error">{error}</p>}
      <div className="pick-list">
        {currentId !== null && (
          <button type="button" className="pick-option muted" onClick={() => pick(null)}>
            None
          </button>
        )}
        {matches.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`pick-option${o.id === currentId ? ' gold' : ''}`}
            onClick={() => pick(o)}
          >
            {o.name}
          </button>
        ))}
        {!matches.length && <p className="muted small">{options.length ? 'Nothing matches.' : 'Nothing yet.'}</p>}
      </div>
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Dialog>
  )
}
