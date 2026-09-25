import { useState } from 'react'
import { useNavigate } from 'react-router'
import { NumberDialog } from '../components/Dialog'
import { must, supabase } from './supabase'

/** A session's notes (ARCHITECTURE.md 1.4). DM only. */
export type Session = {
  id: string
  version: number
  campaign_id: string
  number: number
  title: string
  notes: string
  played_on: string
}

export const SESSION_COLUMNS = 'id, version, campaign_id, number, title, notes, played_on'

/** Live sessions, newest (highest number) first. */
export async function loadSessions(campaignId: string): Promise<Session[]> {
  return must(
    await supabase
      .from('sessions')
      .select(SESSION_COLUMNS)
      .eq('campaign_id', campaignId)
      .is('deleted_at', null)
      .order('number', { ascending: false }),
  ) as Session[]
}

/**
 * New session (1.4): the first one in a campaign asks for the starting
 * number (pre-filled with 1); after that it is the highest number + 1.
 * Opens the note taker. Render `dialog` somewhere on the screen.
 */
export function useNewSession(campaignId: string) {
  const navigate = useNavigate()
  const [askNumber, setAskNumber] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(number?: number) {
    setError(null)
    try {
      const session = must(
        await supabase.rpc('create_session', { p_campaign_id: campaignId, p_number: number ?? null }),
      ) as Session
      navigate(`/c/${campaignId}/sessions/${session.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function start() {
    setError(null)
    try {
      const existing = must(
        await supabase
          .from('sessions')
          .select('id')
          .eq('campaign_id', campaignId)
          .is('deleted_at', null)
          .limit(1),
      ) as { id: string }[]
      if (existing.length) await create()
      else setAskNumber(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const dialog = askNumber ? (
    <NumberDialog
      title="Number of the first session"
      initial={1}
      onClose={() => setAskNumber(false)}
      actions={[{ label: 'Start', onApply: (value) => void create(Math.max(1, value)) }]}
    />
  ) : null

  return { start, dialog, error }
}
