import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ConfirmDialog, Dialog, NumberDialog, PickDialog, PromptDialog } from '../components/Dialog'
import { FactRow } from '../components/FactRow'
import { MarkdownNotes } from '../components/MarkdownNotes'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import { TopBar } from '../components/TopBar'
import { byName } from '../lib/gods'
import { useMe } from '../lib/me'
import { useRowSaver } from '../lib/saver'
import { SESSION_COLUMNS, type Session } from '../lib/sessions'
import { formatPlayedOn, today } from '../lib/sessionText'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Open = 'menu' | 'title' | 'number' | 'date' | 'delete'

/** The note taker (ARCHITECTURE.md 1.4). DM only. */
export function SessionPage() {
  const me = useMe()
  return me.isDm ? <NoteTaker /> : <Navigate to="/" replace />
}

function NoteTaker() {
  const { campaignId = '', sessionId = '' } = useParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open | null>(null)
  const [error, setError] = useState<string | null>(null)
  const close = () => setOpen(null)
  const list = `/c/${campaignId}/sessions`

  const session = useLoad(async () => {
    return must(
      await supabase.from('sessions').select(SESSION_COLUMNS).eq('id', sessionId).is('deleted_at', null).maybeSingle(),
    ) as Session | null
  }, [sessionId])

  const saver = useRowSaver<Session>('sessions', session.data ?? undefined, (saved) => session.mutate(() => saved))
  const s = saver.view

  // Leaving a session with no title and no notes deletes it (1.4), once
  // every change has reached the server.
  const latest = useRef(s)
  useEffect(() => {
    latest.current = s
  })
  const settle = useRef(saver.settle)
  useEffect(() => {
    settle.current = saver.settle
  })
  useEffect(() => {
    return () => {
      const last = latest.current
      if (!last || last.title.trim() || last.notes.trim()) return
      void (async () => {
        const { saved, version } = await settle.current()
        if (!saved || version === null) return
        await supabase
          .from('sessions')
          .update({ deleted_at: new Date().toISOString(), version })
          .eq('id', last.id)
          .eq('title', '')
          .eq('notes', '')
      })()
    }
  }, [])

  /** Number and delete change the row directly, after everything typed has been saved. */
  async function direct(patch: Partial<Session> & { deleted_at?: string }) {
    setError(null)
    const { saved, version } = await saver.settle()
    if (!saved || version === null) throw new Error('Your notes are not saved yet. Try again when they are.')
    const result = await supabase.from('sessions').update({ ...patch, version }).eq('id', sessionId).select(SESSION_COLUMNS).single()
    if (result.error) {
      if (result.error.code === '23505') throw new Error(`There is already a session #${patch.number} in this campaign.`)
      throw new Error(result.error.message)
    }
    return result.data as Session
  }

  if (session.error) {
    return (
      <main className="page">
        <TopBar back={list} />
        <p className="error">{session.error}</p>
      </main>
    )
  }
  if (!s) {
    return (
      <main className="page">
        <TopBar back={list} />
        {!session.loading && <p className="muted">This session does not exist, or it was deleted.</p>}
      </main>
    )
  }

  return (
    <main className="page">
      <TopBar title={`Session #${s.number}`} back={list}>
        <button className="icon secondary" aria-label="More" onClick={() => setOpen('menu')}>
          …
        </button>
      </TopBar>
      <p className="page-status">
        <SaveIndicator status={saver.status} />
      </p>

      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(session.reload)} />
      )}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <FactRow label="Title" value={s.title || 'Untitled'} muted={!s.title} onClick={() => setOpen('title')} />
        <FactRow label="Played on" value={formatPlayedOn(s.played_on)} onClick={() => setOpen('date')} />
      </div>

      <MarkdownNotes
        title="Notes"
        notes={s.notes}
        onChange={(notes) => saver.change({ notes })}
        onBlur={() => void saver.flush()}
        placeholder="What happened this session…"
        emptyText="Nothing written yet. Tap Edit to start."
        tall
        autoFocus={!s.notes}
      />

      <Attendance campaignId={campaignId} sessionId={s.id} />

      {open === 'menu' && (
        <PickDialog<Open>
          title={`Session #${s.number}`}
          onClose={close}
          onPick={(next) => setTimeout(() => setOpen(next))}
          options={[
            { value: 'title', label: 'Rename' },
            { value: 'number', label: 'Change number' },
            { value: 'delete', label: 'Delete session', className: 'danger-text' },
          ]}
        />
      )}
      {open === 'title' && (
        <PromptDialog
          title="Title"
          initial={s.title}
          allowEmpty
          onClose={close}
          onSubmit={(title) => saver.change({ title }, true)}
        />
      )}
      {open === 'date' && (
        <DateDialog initial={s.played_on} onClose={close} onSave={(played_on) => saver.change({ played_on }, true)} />
      )}
      {open === 'number' && (
        <NumberDialog
          title="Session number"
          initial={s.number}
          onClose={close}
          actions={[
            {
              label: 'Set',
              onApply: (value) => {
                const number = Math.max(1, value)
                if (number === s.number) return
                direct({ number })
                  .then((saved) => session.mutate(() => saved))
                  .catch((e) => setError(e instanceof Error ? e.message : String(e)))
              },
            },
          ]}
        />
      )}
      {open === 'delete' && (
        <ConfirmDialog
          title="Delete session"
          message={`Session #${s.number} and its notes will be removed.`}
          confirmLabel="Delete"
          onClose={close}
          onConfirm={async () => {
            await direct({ deleted_at: new Date().toISOString() })
            navigate(list, { replace: true })
          }}
        />
      )}
    </main>
  )
}

/**
 * Attendance (1.4): a checkbox per character in the campaign, sorted by name.
 * Each tap saves at once; unticking removes the row.
 */
function Attendance({ campaignId, sessionId }: { campaignId: string; sessionId: string }) {
  const [error, setError] = useState<string | null>(null)
  const data = useLoad(async () => {
    const [characters, rows] = await Promise.all([
      supabase.from('characters').select('id, name').eq('campaign_id', campaignId).is('deleted_at', null).then(must),
      supabase.from('session_attendance').select('character_id').eq('session_id', sessionId).then(must),
    ])
    return {
      characters: (characters as { id: string; name: string }[]).sort(byName),
      present: new Set((rows as { character_id: string }[]).map((r) => r.character_id)),
    }
  }, [campaignId, sessionId])

  async function toggle(characterId: string, present: boolean) {
    setError(null)
    const update = (on: boolean) =>
      data.mutate((d) => {
        if (!d) return d
        const next = new Set(d.present)
        if (on) next.add(characterId)
        else next.delete(characterId)
        return { ...d, present: next }
      })
    update(present)
    const result = present
      ? await supabase.from('session_attendance').upsert({ session_id: sessionId, character_id: characterId })
      : await supabase.from('session_attendance').delete().eq('session_id', sessionId).eq('character_id', characterId)
    if (result.error) {
      update(!present)
      setError(`Could not save attendance: ${result.error.message}`)
    }
  }

  return (
    <section>
      <h2>Attendance</h2>
      {(error || data.error) && <p className="error">{error ?? data.error}</p>}
      {data.data?.characters.length === 0 && <p className="muted">No characters in this campaign yet.</p>}
      {!!data.data?.characters.length && (
        <div className="card">
          {data.data.characters.map((c) => (
            <label key={c.id} className="check-row">
              <input
                type="checkbox"
                checked={data.data!.present.has(c.id)}
                onChange={(e) => void toggle(c.id, e.target.checked)}
              />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      )}
    </section>
  )
}

/** Pick the played-on date (notes are often written up a day later). */
function DateDialog({ initial, onSave, onClose }: { initial: string; onSave: (date: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(initial)
  return (
    <Dialog title="Played on" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!value) return
          onSave(value)
          onClose()
        }}
      >
        <input type="date" className="text-input" value={value} max="9999-12-31" onChange={(e) => setValue(e.target.value)} />
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={() => setValue(today())}>
            Today
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={!value}>
            OK
          </button>
        </div>
      </form>
    </Dialog>
  )
}
