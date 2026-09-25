import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useMatch } from 'react-router'
import { UpdatePrompt } from './components/UpdatePrompt'
import { checkAccess, INVITE_ONLY, signOutWith } from './lib/access'
import { consumeMailToken } from './lib/emailAuth'
import { MeContext, type Me } from './lib/me'
import { flushAllPending, setPendingOwner } from './lib/saver'
import { must, supabase } from './lib/supabase'
import { useSession } from './lib/useSession'
import { CharacterPage } from './pages/CharacterPage'
import { CharactersPage } from './pages/CharactersPage'
import { DashboardPage, OpenCampaign } from './pages/DashboardPage'
import { GodPage } from './pages/GodPage'
import { GodsPage } from './pages/GodsPage'
import { InvitePage } from './pages/InvitePage'
import { LoginPage } from './pages/LoginPage'
import { PietyPage } from './pages/PietyPage'
import { PlayersPage } from './pages/PlayersPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SessionsPage } from './pages/SessionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useRememberCampaign } from './lib/campaigns'

export default function App() {
  return (
    <>
      <Screens />
      <UpdatePrompt />
    </>
  )
}

function Screens() {
  const session = useSession()
  const onInvite = useMatch('/invite/:code')
  const onPrivacy = useMatch('/privacy')
  const onReset = useMatch('/reset-password')
  // Opened from a verification mail (1.7): log in with its token first.
  const [confirming, setConfirming] = useState(() => !onReset && new URLSearchParams(window.location.search).has('token_hash'))
  const [authNotice, setAuthNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!confirming) return
    consumeMailToken()
      .catch((e) => setAuthNotice(e instanceof Error ? e.message : String(e)))
      .finally(() => setConfirming(false))
    // Once, on the page the mail opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)
  const userId = session?.user.id

  useEffect(() => {
    if (!session) {
      setMe(null)
      return
    }
    let cancelled = false
    const user = session.user
    const joining = !!onInvite
    ;(async () => {
      // Invite-only (1.6). Someone opening an invite link is checked after
      // joining instead (InvitePage), or joining would be refused first.
      if (!joining && !(await checkAccess())) {
        if (!cancelled) await signOutWith(INVITE_ONLY)
        return
      }
      // Players see Theros only once they are in a campaign; the DM always does.
      const [worlds, profile] = await Promise.all([
        supabase
          .from('worlds')
          .select('id, dm_user_id')
          .limit(1)
          .then((r) => must(r) as { id: string; dm_user_id: string | null }[]),
        supabase
          .from('profiles')
          .select('display_name, last_campaign_id')
          .eq('id', user.id)
          .maybeSingle()
          .then((r) => must(r) as { display_name: string; last_campaign_id: string | null } | null),
      ])
      // Send changes left over from an earlier visit before any screen loads,
      // so a screen never races its own leftover save (ARCHITECTURE.md 3.4).
      setPendingOwner(user.id)
      await flushAllPending()
      if (cancelled) return
      setMe({
        userId: user.id,
        name: profile?.display_name || user.user_metadata.full_name || user.email || '',
        isDm: worlds[0]?.dm_user_id === user.id,
        worldId: worlds[0]?.id ?? null,
        lastCampaignId: profile?.last_campaign_id ?? null,
      })
    })().catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
    // Only reload when a different person logs in, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (onPrivacy) return <PrivacyPage />
  if (onReset) return <ResetPasswordPage />
  if (confirming) return <main className="page center muted">Confirming your email…</main>
  if (session === undefined) return null
  if (!session) return <LoginPage inviteCode={onInvite?.params.code} notice={authNotice} />
  if (error) return <main className="page center error">{error}</main>
  if (!me) return null

  return (
    <MeContext.Provider value={{ me, update: (patch) => setMe((m) => m && { ...m, ...patch }) }}>
      <RememberOpenCampaign />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/c/:campaignId" element={<OpenCampaign />} />
        <Route path="/c/:campaignId/characters" element={<CharactersPage />} />
        <Route path="/c/:campaignId/characters/:characterId" element={<CharacterPage />} />
        <Route path="/c/:campaignId/piety" element={<PietyPage />} />
        <Route path="/c/:campaignId/players" element={<PlayersPage />} />
        <Route path="/c/:campaignId/sessions" element={<SessionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/gods" element={<GodsPage />} />
        <Route path="/gods/:slug" element={<GodPage />} />
        <Route path="/invite/:code" element={<InvitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MeContext.Provider>
  )
}

/**
 * A screen inside a campaign (e.g. a shared link to a character) makes that
 * campaign the current one, so Back and the dashboard stay in it.
 */
function RememberOpenCampaign() {
  const campaignId = useMatch('/c/:campaignId/:screen/*')?.params.campaignId
  const remember = useRememberCampaign()
  useEffect(() => {
    if (campaignId) void remember(campaignId)
  }, [campaignId, remember])
  return null
}
