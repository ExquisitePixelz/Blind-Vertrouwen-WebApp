import { useState } from 'react'
import { Dialog } from './Dialog'
import { NAME_MAX } from '../lib/limits'
import { MODIFIER_LIMIT, TARGETS, type Target } from '../lib/sheet'

/** Text of a whole number from −30 to +30 while typing ("-", "-3", "12"). */
function parseSigned(text: string): number | null {
  if (!/^-?\d{1,2}$/.test(text)) return null
  const value = Number(text)
  return Math.abs(value) <= MODIFIER_LIMIT ? value : null
}

/**
 * A whole number from −30 to +30. Phone keypads often have no minus key,
 * so a ± button flips the sign.
 */
function SignedField({ text, onChange }: { text: string; onChange: (text: string) => void }) {
  return (
    <div className="signed-field">
      <button
        type="button"
        className="secondary"
        aria-label="Plus or minus"
        onClick={() => onChange(text.startsWith('-') ? text.slice(1) : `-${text}`)}
      >
        ±
      </button>
      <input
        className="text-input number-input"
        inputMode="numeric"
        value={text}
        onChange={(e) => onChange(e.target.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '').slice(0, 3))}
        onFocus={(e) => e.target.select()}
        aria-label="Value"
      />
    </div>
  )
}

type Saved = Promise<void>

function useSubmit(action: () => Saved, onClose: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      await action()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }
  return { busy, error, run }
}

/**
 * One custom modifier (1.10): a label (may be empty) and a value from −30 to
 * +30. On a saving throw it can be for this save or for all saving throws.
 */
export function ModifierDialog({
  initial,
  saveTarget,
  onSave,
  onDelete,
  onClose,
}: {
  initial: { label: string; value: number; target: Target } | null
  /** Set on a saving throw: offers "this save" or "all saving throws". */
  saveTarget?: Target
  onSave: (label: string, value: number, target: Target | undefined) => Saved
  onDelete?: () => Saved
  onClose: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [text, setText] = useState(initial ? String(initial.value) : '1')
  const [allSaves, setAllSaves] = useState(initial?.target === 'save.all')
  const value = parseSigned(text)
  const target = saveTarget ? (allSaves ? 'save.all' : saveTarget) : undefined
  const submit = useSubmit(() => onSave(label.trim(), value!, target), onClose)
  const remove = useSubmit(() => onDelete!(), onClose)

  return (
    <Dialog title={initial ? 'Modifier' : 'Add modifier'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (value !== null && !submit.busy) void submit.run()
        }}
      >
        <label className="field">
          <span className="muted small">Label (may be empty)</span>
          <input
            className="text-input"
            value={label}
            maxLength={NAME_MAX}
            placeholder="e.g. Elf, Observant, Blessing"
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </label>
        <div className="field">
          <span className="muted small">Value (−30 to +30)</span>
          <SignedField text={text} onChange={setText} />
        </div>
        {saveTarget && (
          <label className="check-row plain">
            <input type="checkbox" checked={allSaves} onChange={(e) => setAllSaves(e.target.checked)} />
            <span>For all saving throws</span>
          </label>
        )}
        {value === null && <p className="error small">Type a whole number from −30 to +30.</p>}
        {(submit.error || remove.error) && <p className="error">{submit.error ?? remove.error}</p>}
        <div className="dialog-actions">
          {onDelete && (
            <button
              type="button"
              className="secondary danger-text dialog-left"
              disabled={remove.busy}
              onClick={() => void remove.run()}
            >
              Delete
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={value === null || submit.busy}>
            OK
          </button>
        </div>
      </form>
    </Dialog>
  )
}

/** One bonus on an item (1.10): a target and a value from −30 to +30. */
export function BonusDialog({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: { target: Target; value: number } | null
  onSave: (target: Target, value: number) => Saved
  onDelete?: () => Saved
  onClose: () => void
}) {
  const [target, setTarget] = useState<Target>(initial?.target ?? 'ac')
  const [text, setText] = useState(initial ? String(initial.value) : '1')
  const value = parseSigned(text)
  const submit = useSubmit(() => onSave(target, value!), onClose)
  const remove = useSubmit(() => onDelete!(), onClose)

  return (
    <Dialog title={initial ? 'Bonus' : 'Add bonus'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (value !== null && !submit.busy) void submit.run()
        }}
      >
        <label className="field">
          <span className="muted small">On</span>
          <select className="text-input" value={target} onChange={(e) => setTarget(e.target.value as Target)}>
            {TARGETS.map((t) => (
              <option key={t.target} value={t.target}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span className="muted small">Value (−30 to +30)</span>
          <SignedField text={text} onChange={setText} />
        </div>
        {value === null && <p className="error small">Type a whole number from −30 to +30.</p>}
        {(submit.error || remove.error) && <p className="error">{submit.error ?? remove.error}</p>}
        <div className="dialog-actions">
          {onDelete && (
            <button
              type="button"
              className="secondary danger-text dialog-left"
              disabled={remove.busy}
              onClick={() => void remove.run()}
            >
              Remove
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={value === null || submit.busy}>
            OK
          </button>
        </div>
      </form>
    </Dialog>
  )
}
