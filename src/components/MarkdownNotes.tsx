import { useState, type ReactNode } from 'react'
import Markdown from 'react-markdown'

type NotesMode = 'edit' | 'preview'

/**
 * A notes area with markdown and an Edit / Preview toggle (ARCHITECTURE.md
 * 1.4, 1.8). Raw HTML in the notes is never rendered (skipHtml). Read-only
 * shows only the formatted text. It opens on Preview when there are notes,
 * on Edit when there are none, and then stays where the user puts it (so
 * typing the first letter does not switch to Preview).
 */
export function MarkdownNotes({
  title,
  notes,
  onChange,
  onBlur,
  placeholder,
  emptyText,
  hint,
  readOnly = false,
  tall = false,
  autoFocus = false,
}: {
  title: string
  notes: string
  onChange: (notes: string) => void
  onBlur: () => void
  placeholder: string
  emptyText: string
  hint?: ReactNode
  readOnly?: boolean
  /** The session note taker's full-height editor. */
  tall?: boolean
  autoFocus?: boolean
}) {
  const [mode, setMode] = useState<NotesMode>(() => (notes.trim() ? 'preview' : 'edit'))
  const shown = readOnly ? 'preview' : mode
  return (
    <section>
      <div className="title-row">
        <h2>{title}</h2>
        {!readOnly && (
          <span className="segmented" role="tablist">
            {(['edit', 'preview'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={mode === m ? 'on' : undefined}
                onClick={() => setMode(m)}
              >
                {m === 'edit' ? 'Edit' : 'Preview'}
              </button>
            ))}
          </span>
        )}
      </div>
      {hint && <p className="muted small notes-hint">{hint}</p>}
      {shown === 'edit' ? (
        <>
          <textarea
            className={`text-input notes${tall ? ' session-notes' : ''}`}
            value={notes}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            autoFocus={autoFocus}
          />
          <p className="muted small">
            Formatting: <code># Heading</code>, <code>- list</code>, <code>**bold**</code>, <code>*italic*</code>
          </p>
        </>
      ) : (
        <div className="card markdown" onDoubleClick={readOnly ? undefined : () => setMode('edit')}>
          {notes.trim() ? (
            <Markdown
              skipHtml
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {notes}
            </Markdown>
          ) : (
            <p className="muted">{emptyText}</p>
          )}
        </div>
      )}
    </section>
  )
}
