import { Link, Navigate, useParams } from 'react-router'
import { TopBar } from '../components/TopBar'
import { useMe } from '../lib/me'
import { loadSessions, useNewSession } from '../lib/sessions'
import { formatPlayedOn, notesSnippet } from '../lib/sessionText'
import { useLoad } from '../lib/useLoad'

/** Sessions list (ARCHITECTURE.md 1.4). DM only; newest first. */
export function SessionsPage() {
  const me = useMe()
  return me.isDm ? <Sessions /> : <Navigate to="/" replace />
}

function Sessions() {
  const { campaignId = '' } = useParams()
  const sessions = useLoad(() => loadSessions(campaignId), [campaignId])
  const newSession = useNewSession(campaignId)

  return (
    <main className="page">
      <TopBar title="Sessions" back="/">
        <button className="icon" aria-label="New session" onClick={() => void newSession.start()}>
          +
        </button>
      </TopBar>

      {(sessions.error || newSession.error) && <p className="error">{sessions.error ?? newSession.error}</p>}
      {sessions.data?.length === 0 && <p className="muted">No sessions yet. Tap + to start one.</p>}
      <ul className="list">
        {sessions.data?.map((s) => {
          const snippet = notesSnippet(s.notes)
          return (
            <li key={s.id}>
              <Link to={`/c/${campaignId}/sessions/${s.id}`} className="row">
                <div className="row-split">
                  <span className="session-head">
                    <span className="gold session-number">#{s.number}</span>
                    <strong className={s.title ? undefined : 'muted'}>{s.title || 'Untitled'}</strong>
                  </span>
                  <span className="muted small nowrap">{formatPlayedOn(s.played_on)}</span>
                </div>
                {snippet && <div className="muted small">{snippet}</div>}
              </Link>
            </li>
          )
        })}
      </ul>
      {newSession.dialog}
    </main>
  )
}
