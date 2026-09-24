import { useState } from 'react'
import { ConfirmDialog } from './Dialog'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Invite = { id: string; code: string; expires_at: string | null; created_at: string }

/** How long a new invite link works. */
const INVITE_DAYS = 7

function inviteUrl(code: string) {
  return `${window.location.origin}/invite/${code}`
}

/** DM only: make, share and revoke invite links for one campaign. */
export function InvitesSection({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const [revoking, setRevoking] = useState<Invite | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const invites = useLoad(async () => {
    const rows = must(
      await supabase
        .from('campaign_invites')
        .select('id, code, expires_at, created_at')
        .eq('campaign_id', campaignId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false }),
    ) as Invite[]
    const now = Date.now()
    return rows.filter((i) => !i.expires_at || new Date(i.expires_at).getTime() > now)
  }, [campaignId])

  async function createInvite() {
    setError(null)
    try {
      const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString()
      must(await supabase.from('campaign_invites').insert({ campaign_id: campaignId, expires_at: expires }))
      await invites.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function share(invite: Invite) {
    const url = inviteUrl(invite.code)
    if (navigator.share) {
      try {
        await navigator.share({ title: campaignName, text: `Join our Theros campaign "${campaignName}":`, url })
        return
      } catch {
        // Share sheet closed or unavailable: copy instead.
      }
    }
    await copy(invite)
  }

  async function copy(invite: Invite) {
    try {
      await navigator.clipboard.writeText(inviteUrl(invite.code))
      setCopied(invite.id)
    } catch {
      setError('Could not copy. Select the link and copy it by hand.')
    }
  }

  return (
    <section>
      <div className="title-row">
        <h2>Invite links</h2>
        <button className="secondary" onClick={createInvite}>
          New link
        </button>
      </div>
      <p className="muted small">
        Share a link in WhatsApp. Anyone who opens it and logs in joins this campaign. Links work for {INVITE_DAYS}{' '}
        days.
      </p>
      {(error || invites.error) && <p className="error">{error ?? invites.error}</p>}
      {invites.data?.length === 0 && <p className="muted">No active links.</p>}
      <ul className="list">
        {invites.data?.map((invite) => (
          <li key={invite.id} className="row invite">
            <code className="invite-url">{inviteUrl(invite.code)}</code>
            <span className="muted small">
              {invite.expires_at
                ? `Works until ${new Date(invite.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                : 'No expiry'}
            </span>
            <span className="invite-actions">
              <button onClick={() => share(invite)}>Share</button>
              <button className="secondary" onClick={() => copy(invite)}>
                {copied === invite.id ? 'Copied' : 'Copy'}
              </button>
              <button className="secondary danger-text" onClick={() => setRevoking(invite)}>
                Revoke
              </button>
            </span>
          </li>
        ))}
      </ul>

      {revoking && (
        <ConfirmDialog
          title="Revoke invite link"
          message="Nobody new can join with this link. Players who already joined stay in the campaign."
          confirmLabel="Revoke"
          onClose={() => setRevoking(null)}
          onConfirm={async () => {
            must(
              await supabase
                .from('campaign_invites')
                .update({ revoked_at: new Date().toISOString() })
                .eq('id', revoking.id),
            )
            await invites.reload()
          }}
        />
      )}
    </section>
  )
}
