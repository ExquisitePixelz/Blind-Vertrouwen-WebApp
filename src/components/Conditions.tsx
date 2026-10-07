import { useState } from 'react'
import { Dialog } from './Dialog'
import { activeConditions, CONDITIONS, MAX_EXHAUSTION, type ConditionKey } from '../lib/rest'

/** The active conditions as chips, each in its own colour, then `Exhaustion n` when above 0 (1.12). */
export function ConditionChips({ conditions, exhaustion }: { conditions: ConditionKey[]; exhaustion: number }) {
  return (
    <span className="chips">
      {activeConditions(conditions).map(({ key, label }) => (
        <span key={key} className="chip condition" data-condition={key}>
          {label}
        </span>
      ))}
      {exhaustion > 0 && <span className="chip exhaustion">Exhaustion {exhaustion}</span>}
    </span>
  )
}

/**
 * Switch conditions on and off, and set exhaustion (1.12). Every tap saves
 * at once. The switches show the tap straight away; if a save fails they go
 * back to what the sheet holds, with the message.
 */
export function ConditionsDialog({
  conditions,
  exhaustion,
  onToggle,
  onExhaustion,
  onClose,
}: {
  conditions: ConditionKey[]
  exhaustion: number
  onToggle: (key: ConditionKey, on: boolean) => Promise<void>
  onExhaustion: (level: number) => void
  onClose: () => void
}) {
  const [shown, setShown] = useState(conditions)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: ConditionKey, on: boolean) {
    setError(null)
    setShown((list) => (on ? [...list, key] : list.filter((k) => k !== key)))
    onToggle(key, on).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : String(e))
      setShown(conditions)
    })
  }

  return (
    <Dialog title="Conditions" onClose={onClose}>
      <div className="card dialog-card">
        {CONDITIONS.map(({ key, label }) => (
          <label key={key} className="check-row">
            <input type="checkbox" checked={shown.includes(key)} onChange={(e) => toggle(key, e.target.checked)} />
            <span>{label}</span>
          </label>
        ))}
        <div className="pips-row">
          <span>Exhaustion</span>
          <span className="stepper">
            <button
              type="button"
              className="round"
              aria-label="Less exhaustion"
              disabled={exhaustion <= 0}
              onClick={() => onExhaustion(exhaustion - 1)}
            >
              −
            </button>
            <strong className="stepper-value">{exhaustion}</strong>
            <button
              type="button"
              className="round"
              aria-label="More exhaustion"
              disabled={exhaustion >= MAX_EXHAUSTION}
              onClick={() => onExhaustion(exhaustion + 1)}
            >
              +
            </button>
          </span>
        </div>
      </div>
      {exhaustion >= MAX_EXHAUSTION && <p className="error small">Exhaustion 6: the character dies.</p>}
      {error && <p className="error">{error}</p>}
      <div className="dialog-actions">
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  )
}
