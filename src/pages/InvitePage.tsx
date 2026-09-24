import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMe } from '../lib/me'
import { must, supabase } from '../lib/supabase'

/** Opened from an invite link, once logged in: join, then go to the campaign. */
export function InvitePage() {
  const { code = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function join() {
      try {
        let campaignId: string | undefined
        if (me.isDm) {
          // The DM is never a member; just open the campaign.
          const invite = must(
            await supabase.from('campaign_invites').select('campaign_id').eq('code', code).maybeSingle(),
          ) as { campaign_id: string } | null
          campaignId = invite?.campaign_id
          if (!campaignId) throw new Error('This invite link is invalid or has expired.')
        } else {
          campaignId = must(await supabase.rpc('accept_invite', { p_code: code })) as string
        }
        if (!cancelled) navigate(`/c/${campaignId}`, { replace: true })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }
    join()
    return () => {
      cancelled = true
    }
  }, [code, me.isDm, navigate])

  return (
    <main className="page center">
      {error ? (
        <>
          <p className="error">{error}</p>
          <p className="muted">Ask the DM for a new link.</p>
        </>
      ) : (
        <p className="muted">Joining the campaign…</p>
      )}
    </main>
  )
}
