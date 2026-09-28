import { useState } from 'react'
import { Dialog } from './Dialog'
import { NAME_MAX } from '../lib/limits'
import type { ClassEntry } from '../lib/sheet'

/**
 * One class entry (1.10): a name (may be empty) and a level from 1 to
 * `maxLevel`, so the total level stays at 20 or less. Remove is offered
 * when the entry is not the last one.
 */
export function ClassDialog({
  entry,
  maxLevel,
  onSave,
  onRemove,
  onClose,
}: {
  /** Null for a new entry (Add class). */
  entry: ClassEntry | null
  maxLevel: number
  onSave: (entry: ClassEntry) => Promise<void>
  onRemove?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(entry?.name ?? '')
  const [levelText, setLevelText] = useState(String(entry?.level ?? 1))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const level = Number(levelText || '0')
  const valid = level >= 1 && level <= maxLevel

  return (
    <Dialog title={entry ? 'Class' : 'Add class'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!valid || busy) return
          setBusy(true)
          setError(null)
          try {
            await onSave({ name: name.trim(), level })
            onClose()
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
            setBusy(false)
          }
        }}
      >
        <label className="field">
          <span className="muted small">Class (may be empty)</span>
          <input
            className="text-input"
            value={name}
            maxLength={NAME_MAX}
            placeholder="e.g. Fighter"
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="field">
          <span className="muted small">Level (1 to {maxLevel})</span>
          <input
            className="text-input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={levelText}
            onChange={(e) => setLevelText(e.target.value.replace(/\D/g, '').slice(0, 2))}
            onFocus={(e) => e.target.select()}
          />
        </label>
        {!valid && <p className="error small">The level must be 1 to {maxLevel}; the total level is at most 20.</p>}
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          {onRemove && (
            <button type="button" className="secondary danger-text dialog-left" onClick={onRemove}>
              Remove
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={!valid || busy}>
            OK
          </button>
        </div>
      </form>
    </Dialog>
  )
}
