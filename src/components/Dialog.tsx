import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A modal dialog. Cancel, Escape, or tapping outside closes it without
 * changing anything (ARCHITECTURE.md 1.3 A1-A4).
 */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <h2>{title}</h2>
      {children}
    </dialog>
  )
}

/** A2: one trimmed text field with Cancel/OK. */
export function PromptDialog({
  title,
  initial = '',
  allowEmpty = false,
  submitLabel = 'OK',
  onSubmit,
  onClose,
}: {
  title: string
  initial?: string
  allowEmpty?: boolean
  submitLabel?: string
  onSubmit: (value: string) => Promise<void> | void
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = value.trim()

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!allowEmpty && !trimmed) return
          setBusy(true)
          setError(null)
          try {
            await onSubmit(trimmed)
            onClose()
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
            setBusy(false)
          }
        }}
      >
        <input
          className="text-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy || (!allowEmpty && !trimmed)}>
            {submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

/** A3: used for every delete. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog title={title} onClose={onClose}>
      <p>{message}</p>
      {error && <p className="error">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onConfirm()
              onClose()
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err))
              setBusy(false)
            }
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}

type NumberAction = { label: string; className?: string; onApply: (value: number) => void }

/**
 * A1: edit a number. Typing replaces the value shown (it is selected on
 * focus), at most 4 digits, and an empty entry counts as 0. No field on a
 * character allows negatives.
 */
export function NumberDialog({
  title,
  initial,
  actions,
  onClose,
}: {
  title: string
  initial: number
  actions: NumberAction[]
  onClose: () => void
}) {
  const [text, setText] = useState(String(initial))
  const value = Number(text || '0')

  function apply(action: NumberAction) {
    action.onApply(value)
    onClose()
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (actions.length === 1) apply(actions[0])
        }}
      >
        <input
          className="text-input number-input"
          inputMode="numeric"
          pattern="[0-9]*"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onFocus={(e) => e.target.select()}
          autoFocus
        />
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          {actions.map((action) => (
            <button key={action.label} type="button" className={action.className} onClick={() => apply(action)}>
              {action.label}
            </button>
          ))}
        </div>
      </form>
    </Dialog>
  )
}

/** A4: a list of options; tapping one closes the dialog and applies it. */
export function PickDialog<T>({
  title,
  options,
  onPick,
  onClose,
}: {
  title: string
  options: { value: T; label: string; className?: string }[]
  onPick: (value: T) => void
  onClose: () => void
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="pick-list">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`pick-option ${option.className ?? ''}`}
            onClick={() => {
              onPick(option.value)
              onClose()
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Dialog>
  )
}
