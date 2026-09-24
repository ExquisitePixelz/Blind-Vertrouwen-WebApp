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
