import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Markdown, { defaultUrlTransform } from 'react-markdown'
import { Link } from 'react-router'
import { Dialog } from './Dialog'
import { NOTES_MAX } from '../lib/limits'
import { useLinkTargets } from '../lib/linkTargets'
import {
  KIND_LABELS,
  findTarget,
  fromEditable,
  hasLinks,
  insertMention,
  insertSpoiler,
  mentionAt,
  mentionMatches,
  parseLinkHref,
  parseSpoilerHref,
  spoilerIds,
  toEditable,
  type LinkLabels,
  type LinkTarget,
} from '../lib/links'
import { useMe } from '../lib/me'
import {
  createSpoiler,
  deleteSpoiler,
  saveSpoiler,
  useSpoilers,
  type Spoiler,
  type SpoilerParent,
} from '../lib/spoilers'

type NotesMode = 'edit' | 'preview'

/** Our own links (character:, god:, npc:, place: …) and spoilers pass; everything else gets the usual safety check. */
const urlTransform = (url: string) => (parseLinkHref(url) || parseSpoilerHref(url) ? url : defaultUrlTransform(url))

/**
 * A notes area with markdown and an Edit / Preview toggle (ARCHITECTURE.md
 * 1.4, 1.8). Raw HTML in the notes is never rendered (skipHtml). Read-only
 * shows only the formatted text. It opens on Preview when there are notes,
 * on Edit when there are none, and then stays where the user puts it (so
 * typing the first letter does not switch to Preview).
 *
 * Links (1.13, 1.14): typing @ in Edit offers characters, gods, NPCs and the
 * rest of World; Preview shows a link as the target's current name. A
 * player sees [hidden] for a target they cannot see (hidden or deleted); the
 * DM sees a link hidden from the campaign's players in grey-blue with a
 * crossed-out eye, and a deleted target as [deleted].
 *
 * Spoilers (1.13, 2026-10-09), with `spoilerParent`: Make spoiler turns the
 * selected passage into a spoiler. Preview shows it to whoever may read it,
 * and a "Spoiler" block to everyone else. Its author and the DM tap it to
 * edit it or choose who knows it; nobody else can remove it.
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
  spoilerParent,
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
  /** The text spoilers can be made in: a backstory, an NPC or a World entry. */
  spoilerParent?: SpoilerParent
}) {
  const me = useMe()
  const [mode, setMode] = useState<NotesMode>(() => (notes.trim() ? 'preview' : 'edit'))
  const shown = readOnly ? 'preview' : mode
  const area = useRef<HTMLTextAreaElement>(null)
  const [caret, setCaret] = useState<number | null>(null)
  // The @ the user closed with Escape stays closed until another one is typed.
  const [dismissed, setDismissed] = useState<number | null>(null)
  const [active, setActive] = useState(0)
  // What the Edit box shows (links as @[Name], 2026-10-09), and the saved
  // notes it was made from or saved as. Made again when the notes change
  // from elsewhere (a reload, someone else's version).
  const [edit, setEdit] = useState<{ text: string; labels: LinkLabels; source: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [openSpoiler, setOpenSpoiler] = useState<string | null>(null)

  const linked = hasLinks(notes)
  const ids = spoilerIds(notes)
  const { spoilers, reload: reloadSpoilers } = useSpoilers(ids)
  const editText = edit?.source === notes ? edit.text : null
  const mention = shown === 'edit' && caret !== null && editText !== null ? mentionAt(editText, caret) : null
  const open = mention && mention.start !== dismissed ? mention : null
  // Character names are needed for "Known by" and the spoiler dialog too.
  const targets = useLinkTargets(linked || !!open || ids.length > 0)
  const matches = open && targets ? mentionMatches(targets, open.query) : []
  const listShown = open && matches.length > 0

  // Names need the link targets; text without links can be shown at once.
  if (shown === 'edit' && editText === null && (targets || !linked)) {
    setEdit({ ...toEditable(notes, targets ?? [], me.isDm), source: notes })
  }

  /** May the viewer edit, reveal or remove this spoiler? Its author and the DM. */
  const mine = (id: string) => me.isDm || spoilers?.get(id)?.author_id === me.userId

  /** The Edit box changed: save it with the links as [](kind:id). */
  function change(text: string, labels: LinkLabels) {
    const saved = fromEditable(text, labels)
    // Someone else's spoiler stays (the database refuses it too).
    const before = edit ? spoilerIds(edit.source) : ids
    if (before.some((id) => !saved.toLowerCase().includes(`(spoiler:${id})`) && !mine(id))) {
      setNotice('Only its author or the DM can remove a spoiler.')
      return
    }
    setNotice(null)
    setEdit({ text, labels, source: saved })
    onChange(saved)
  }

  const track = () => setCaret(area.current?.selectionStart ?? null)

  function pick(index: number) {
    if (!open || caret === null || editText === null || !edit) return
    const target = matches[index]
    if (!target) return
    const labels = new Map(edit.labels)
    const result = insertMention(editText, open.start, caret, target, labels)
    change(result.text, labels)
    setCaret(result.caret)
    requestAnimationFrame(() => {
      area.current?.focus()
      area.current?.setSelectionRange(result.caret, result.caret)
    })
  }

  /** Make spoiler: the selected passage becomes its own row, the text keeps its marker. */
  async function makeSpoiler() {
    const el = area.current
    if (!spoilerParent || !el || !edit || editText === null) return
    const [start, end] = [el.selectionStart, el.selectionEnd]
    const passage = editText.slice(start, end)
    if (!passage.trim()) {
      setNotice('Select the passage to hide first, then tap Make spoiler.')
      return
    }
    if (/@\[spoiler \d+\]/.test(passage)) {
      setNotice('A spoiler cannot hold another spoiler.')
      return
    }
    setBusy(true)
    try {
      const id = await createSpoiler(spoilerParent, fromEditable(passage, edit.labels).trim())
      const labels = new Map(edit.labels)
      const result = insertSpoiler(editText, start, end, id, labels)
      change(result.text, labels)
      onBlur() // save the marker straight away; the new spoiler loads with the new text
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(result.caret, result.caret)
      })
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  /** A deleted spoiler's marker goes too. */
  function removeMarker(id: string) {
    onChange(notes.replace(new RegExp(`\\[\\]\\(spoiler:${id}\\)`, 'gi'), ''))
    onBlur()
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

  const characters = (targets ?? []).filter((t) => t.kind === 'character')
  const editing = openSpoiler ? spoilers?.get(openSpoiler) : undefined

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
      {shown === 'edit' && editText === null ? (
        <p className="muted">Loading…</p>
      ) : shown === 'edit' ? (
        <>
          <textarea
            ref={area}
            className={`text-input notes${tall ? ' session-notes' : ''}`}
            value={editText ?? ''}
            maxLength={NOTES_MAX}
            placeholder={placeholder}
            onChange={(e) => {
              change(e.target.value, edit?.labels ?? new Map())
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
          {notice && <p className="error small">{notice}</p>}
          {spoilerParent && (
            <div className="spoiler-tools">
              <button
                type="button"
                className="small-button secondary"
                disabled={busy}
                // Keep the selection in the text while tapping.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => void makeSpoiler()}
              >
                Make spoiler
              </button>
              <span className="muted small">Select a passage first. Only you and the DM can read it until you reveal it.</span>
            </div>
          )}
          <p className="muted small">
            Formatting: <code># Heading</code>, <code>- list</code>, <code>**bold**</code>, <code>*italic*</code>,{' '}
            <code>@</code> to link a character, god, NPC, place and more
          </p>
        </>
      ) : (
        <div className="card markdown" onDoubleClick={readOnly ? undefined : () => setMode('edit')}>
          {notes.trim() ? (
            <MarkdownText
              text={notes}
              targets={targets}
              spoilers={spoilers}
              onSpoiler={(id) => mine(id) && setOpenSpoiler(id)}
            />
          ) : (
            <p className="muted">{emptyText}</p>
          )}
        </div>
      )}

      {editing && openSpoiler && (
        <SpoilerDialog
          spoiler={editing}
          characters={characters}
          onSaved={() => void reloadSpoilers()}
          onDeleted={() => removeMarker(editing.id)}
          onClose={() => setOpenSpoiler(null)}
        />
      )}
    </section>
  )
}

/**
 * Notes text with its formatting and links, read-only: for text shown
 * outside a notes area, such as a custom faith's description on the Piety
 * page (2026-10-09). It loads the link targets only when the text has links.
 */
export function FormattedText({ text, className }: { text: string; className?: string }) {
  const targets = useLinkTargets(hasLinks(text))
  return (
    <div className={`markdown${className ? ` ${className}` : ''}`}>
      <MarkdownText text={text} targets={targets} />
    </div>
  )
}

/** Inside a spoiler only inline formatting is kept, so it fits in a sentence. */
const INLINE = ['p', 'strong', 'em', 'del', 'code', 'a', 'br']

/** The markdown itself, with links and spoilers. */
function MarkdownText({
  text,
  targets,
  spoilers,
  onSpoiler,
  inline = false,
}: {
  text: string
  targets: LinkTarget[] | null
  /** The spoilers the viewer may read; null while loading or without spoilers. */
  spoilers?: Map<string, Spoiler> | null
  onSpoiler?: (id: string) => void
  inline?: boolean
}) {
  const me = useMe()
  return (
    <Markdown
      skipHtml
      urlTransform={urlTransform}
      allowedElements={inline ? INLINE : undefined}
      unwrapDisallowed={inline}
      components={{
        ...(inline ? { p: ({ children }) => <>{children} </> } : {}),
        a: ({ href, children }) => {
          const spoilerId = parseSpoilerHref(href)
          if (spoilerId) {
            const spoiler = spoilers?.get(spoilerId)
            if (!spoiler) return <span className="spoiler locked">Spoiler</span>
            const known = spoiler.to_everyone
              ? 'Revealed to everyone'
              : spoiler.knowers.length
                ? `Known by ${spoiler.knowers.map((id) => targets?.find((t) => t.kind === 'character' && t.id === id)?.name ?? 'a character').join(', ')}`
                : 'Only its author and the DM'
            return (
              <span
                className={`spoiler open${onSpoiler ? ' tappable' : ''}`}
                role={onSpoiler ? 'button' : undefined}
                tabIndex={onSpoiler ? 0 : undefined}
                onClick={onSpoiler ? () => onSpoiler(spoilerId) : undefined}
              >
                <MarkdownText text={spoiler.text} targets={targets} inline />
                <span className="spoiler-known">{known}</span>
              </span>
            )
          }
          if (parseLinkHref(href)) {
            const target = targets && findTarget(targets, href)
            if (target?.hidden) {
              return (
                <Link to={target.path} className="mention hidden" title="Hidden from players">
                  {target.name}
                  <EyeOff />
                </Link>
              )
            }
            if (target) {
              return (
                <Link to={target.path} className="mention">
                  {target.name}
                </Link>
              )
            }
            // A deleted target: older links still carry their name; newer ones have none.
            if (me.isDm) return children ? <span>{children}</span> : <span className="muted">[deleted]</span>
            // A player never sees the name written in the link, not even while loading.
            return <span className="muted">{targets ? '[hidden]' : '…'}</span>
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          )
        },
      }}
    >
      {text}
    </Markdown>
  )
}

/**
 * A spoiler's text and who knows it, for its author and the DM. Who knows:
 * the characters of the campaign, or everyone who can read the text.
 */
function SpoilerDialog({
  spoiler,
  characters,
  onSaved,
  onDeleted,
  onClose,
}: {
  spoiler: Spoiler
  characters: LinkTarget[]
  onSaved: () => void
  onDeleted: () => void
  onClose: () => void
}) {
  const [text, setText] = useState(spoiler.text)
  const [everyone, setEveryone] = useState(spoiler.to_everyone)
  const [knowers, setKnowers] = useState(spoiler.knowers)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <Dialog title="Spoiler" onClose={onClose}>
      <MarkdownNotes
        title="Text"
        notes={text}
        onChange={setText}
        onBlur={() => {}}
        placeholder="What only some may know…"
        emptyText="Nothing written."
      />
      <h2>Who knows</h2>
      <div className="card">
        <label className="check-row">
          <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} />
          <span>Everyone who can read this</span>
        </label>
        {characters.map((c) => (
          <label key={c.id} className="check-row">
            <input
              type="checkbox"
              checked={everyone || knowers.includes(c.id)}
              disabled={everyone}
              onChange={(e) => {
                const on = e.target.checked
                setKnowers((k) => (on ? [...k, c.id] : k.filter((x) => x !== c.id)))
              }}
            />
            <span>{c.name}</span>
          </label>
        ))}
      </div>
      <p className="muted small">The author and the DM always know. Others only see that a spoiler is here.</p>
      {error && <p className="error">{error}</p>}
      <div className="dialog-actions">
        <button
          type="button"
          className="secondary danger-text dialog-left"
          disabled={busy}
          onClick={() =>
            confirming
              ? void run(async () => {
                  await deleteSpoiler(spoiler.id)
                  onDeleted()
                })
              : setConfirming(true)
          }
        >
          {confirming ? 'Delete for good?' : 'Delete'}
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await saveSpoiler(spoiler, text.trim(), everyone, everyone ? spoiler.knowers : knowers)
              onSaved()
            })
          }
        >
          Save
        </button>
      </div>
    </Dialog>
  )
}

/** A small crossed-out eye after a link the players cannot see (DM only). */
function EyeOff() {
  return (
    <svg className="eye-off" viewBox="0 0 24 24" aria-label="hidden from players" role="img">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M4 20 20 4" />
    </svg>
  )
}
