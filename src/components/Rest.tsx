import { useState } from 'react'
import { Dialog } from './Dialog'
import { formatModifier } from '../lib/character'
import { shortRestHealing, type DiceRow, type Die } from '../lib/rest'

/**
 * Long rest (1.12): lists what will change, then rests through the database
 * (`long_rest`). `groups` holds one list of changes per character; a single
 * character has one group without a name.
 */
export function LongRestDialog({
  title,
  groups,
  onConfirm,
  onClose,
}: {
  title: string
  groups: { name?: string; changes: string[] }[]
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog title={title} onClose={onClose}>
      <div className="rest-changes">
        {groups.map((g, i) => (
          <div key={i}>
            {g.name && <strong>{g.name}</strong>}
            {g.changes.length ? (
              <ul>
                {g.changes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Nothing to restore.</p>
            )}
          </div>
        ))}
      </div>
      <p className="muted small">Death saves go back to 0. Other conditions stay.</p>
      {error && <p className="error">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await onConfirm()
              onClose()
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err))
              setBusy(false)
            }
          }}
        >
          Long rest
        </button>
      </div>
    </Dialog>
  )
}

/**
 * Short rest (1.12): pick a die size, type what the real die showed, and the
 * character heals the roll plus the CON modifier. The dialog stays open for
 * the next die; Done closes it.
 */
export function ShortRestDialog({
  hp,
  dice,
  conModifier,
  onSpend,
  onClose,
}: {
  /** "HP 12 / 30", kept up to date while dice are spent. */
  hp: string
  dice: DiceRow[]
  conModifier: number
  onSpend: (die: Die, roll: number) => void
  onClose: () => void
}) {
  const [die, setDie] = useState<Die | null>(null)
  const [text, setText] = useState('')
  const roll = Number(text || '0')
  const valid = die !== null && roll >= 1 && roll <= die
  const left = dice.reduce((sum, r) => sum + r.left, 0)

  if (die !== null) {
    return (
      <Dialog title={`Roll a d${die}`} onClose={onClose}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            onSpend(die, roll)
            setDie(null)
            setText('')
          }}
        >
          <label className="field">
            <span className="muted small">What did you roll on the d{die}?</span>
            <input
              className="text-input number-input"
              inputMode="numeric"
              pattern="[0-9]*"
              value={text}
              onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 2))}
              autoFocus
            />
          </label>
          <p className="muted small">
            {valid
              ? `Heals ${roll} ${formatModifier(conModifier)} CON = ${shortRestHealing(roll, conModifier)} HP`
              : `A number from 1 to ${die}.`}
          </p>
          <div className="dialog-actions">
            <button type="button" className="secondary" onClick={() => setDie(null)}>
              Back
            </button>
            <button type="submit" disabled={!valid}>
              Heal
            </button>
          </div>
        </form>
      </Dialog>
    )
  }

  return (
    <Dialog title="Short rest" onClose={onClose}>
      <p className="muted">{hp}. Spend hit dice to heal: roll them, then tap the die and type the roll.</p>
      <div className="card dialog-card">
        {dice.map((r) => (
          <button
            key={r.die}
            type="button"
            className="fact-row"
            disabled={r.left === 0}
            onClick={() => setDie(r.die)}
          >
            <span>d{r.die}</span>
            <span className="muted">
              {r.left} of {r.total} left
            </span>
          </button>
        ))}
      </div>
      {left === 0 && <p className="muted small">No hit dice left. A long rest gives some back.</p>}
      <div className="dialog-actions">
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  )
}
