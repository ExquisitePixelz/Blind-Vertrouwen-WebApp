import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Markdown, { defaultUrlTransform } from 'react-markdown'
import { Link } from 'react-router'
import { NOTES_MAX } from '../lib/limits'
import { useLinkTargets } from '../lib/linkTargets'
import { KIND_LABELS, findTarget, hasLinks, insertMention, mentionAt, mentionMatches, parseLinkHref } from '../lib/links'

type NotesMode = 'edit' | 'preview'

/** Our own links (character:, god:, npc:) pass; everything else gets the usual safety check. */
const urlTransform = (url: string) => (parseLinkHref(url) ? url : defaultUrlTransform(url))

/**
 * A notes area with markdown and an Edit / Preview toggle (ARCHITECTURE.md
 * 1.4, 1.8). Raw HTML in the notes is never rendered (skipHtml). Read-only
 * shows only the formatted text. It opens on Preview when there are notes,
 * on Edit when there are none, and then stays where the user puts it (so
 * typing the first letter does not switch to Preview).
 *
 * Links (1.13): typing @ in Edit offers characters, gods and NPCs; Preview
 * shows a link as the target's current name, or as plain text when the
 * reader cannot see the target.
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
  const area = useRef<HTMLTextAreaElement>(null)
  const [caret, setCaret] = useState<number | null>(null)
  // The @ the user closed with Escape stays closed until another one is typed.
  const [dismissed, setDismissed] = useState<number | null>(null)
  const [active, setActive] = useState(0)

  const mention = shown === 'edit' && caret !== null ? mentionAt(notes, caret) : null
  const open = mention && mention.start !== dismissed ? mention : null
  const targets = useLinkTargets((shown === 'preview' && hasLinks(notes)) || !!open)
  const matches = open && targets ? mentionMatches(targets, open.query) : []
  const listShown = open && matches.length > 0

  const track = () => setCaret(area.current?.selectionStart ?? null)

  function pick(index: number) {
    if (!open || caret === null) return
    const target = matches[index]
    if (!target) return
    const result = insertMention(notes, open.start, caret, target)
    onChange(result.text)
    setCaret(result.caret)
    requestAnimationFrame(() => {
      area.current?.focus()
      area.current?.setSelectionRange(result.caret, result.caret)
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!listShown) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a + step + matches.length) % matches.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      pick(Math.min(active, matches.length - 1))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDismissed(open.start)
    }
  }

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
            ref={area}
            className={`text-input notes${tall ? ' session-notes' : ''}`}
            value={notes}
            maxLength={NOTES_MAX}
            placeholder={placeholder}
            onChange={(e) => {
              onChange(e.target.value)
              setCaret(e.target.selectionStart)
              setActive(0)
            }}
            onSelect={track}
            onClick={track}
            onKeyDown={onKeyDown}
            onBlur={() => {
              setCaret(null)
              onBlur()
            }}
            autoFocus={autoFocus}
            aria-autocomplete="list"
            aria-expanded={!!listShown}
          />
          {listShown && (
            <ul className="mention-list" role="listbox" aria-label="Link to">
              {matches.map((t, i) => (
                <li key={`${t.kind}:${t.id}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    className={i === active ? 'on' : undefined}
                    // Keep the focus (and the caret) in the text while tapping.
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => pick(i)}
                  >
                    <span>{t.name}</span>
                    <span className="muted small">{KIND_LABELS[t.kind]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">
            Formatting: <code># Heading</code>, <code>- list</code>, <code>**bold**</code>, <code>*italic*</code>,{' '}
            <code>@</code> to link a character, god or NPC
          </p>
        </>
      ) : (
        <div className="card markdown" onDoubleClick={readOnly ? undefined : () => setMode('edit')}>
          {notes.trim() ? (
            <Markdown
              skipHtml
              urlTransform={urlTransform}
              components={{
                a: ({ href, children }) => {
                  if (parseLinkHref(href)) {
                    const target = targets && findTarget(targets, href)
                    return target ? (
                      <Link to={target.path} className="mention">
                        {target.name}
                      </Link>
                    ) : (
                      <span>{children}</span>
                    )
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  )
                },
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
