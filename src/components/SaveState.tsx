import type { SaveStatus } from '../lib/saver'

const LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  unsaved: 'Not saved yet',
  conflict: 'Not saved: changed elsewhere',
}

/** The small "Saved / Saving… / Not saved yet" indicator (ARCHITECTURE.md 3.4). */
export function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span className={`save-indicator ${status}`} role="status">
      {LABELS[status]}
    </span>
  )
}

/** Shown when someone else saved this in the meantime. Never overwrite silently. */
export function ConflictBanner({ onKeepMine, onUseTheirs }: { onKeepMine: () => void; onUseTheirs: () => void }) {
  return (
    <div className="conflict" role="alert">
      <p>Someone else changed this while you were editing. Your changes are not saved yet.</p>
      <div className="dialog-actions">
        <button className="secondary" onClick={onUseTheirs}>
          Use their version
        </button>
        <button onClick={onKeepMine}>Keep mine</button>
      </div>
    </div>
  )
}
