import { lazy, startTransition, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useMatch } from 'react-router'
import { Footer } from './components/Footer'
import { UpdatePrompt } from './components/UpdatePrompt'
import { checkAccess, INVITE_ONLY, signOutWith } from './lib/access'
import { consumeMailToken } from './lib/emailAuth'
import { MeContext, type Me } from './lib/me'
import { flushAllPending, setPendingOwner } from './lib/saver'
import { must, supabase } from './lib/supabase'
import { useSession } from './lib/useSession'
import { LoginPage } from './pages/LoginPage'
import { useRememberCampaign } from './lib/campaigns'

// Each screen is its own file, loaded when it is first opened (ARCHITECTURE.md
// 1.11 A1), so the login page and the dashboard do not carry the rest. The
// login screen itself (1.4 KB) stays in the main file: a first visit then
// needs no extra round trip before it shows.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const OpenCampaign = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.OpenCampaign })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const InvitePage = lazy(() => import('./pages/InvitePage').then((m) => ({ default: m.InvitePage })))
const CharactersPage = lazy(() => import('./pages/CharactersPage').then((m) => ({ default: m.CharactersPage })))
const CharacterPage = lazy(() => import('./pages/CharacterPage').then((m) => ({ default: m.CharacterPage })))
const PietyPage = lazy(() => import('./pages/PietyPage').then((m) => ({ default: m.PietyPage })))
const PlayersPage = lazy(() => import('./pages/PlayersPage').then((m) => ({ default: m.PlayersPage })))
const QuestsPage = lazy(() => import('./pages/QuestsPage').then((m) => ({ default: m.QuestsPage })))
const QuestPage = lazy(() => import('./pages/QuestPage').then((m) => ({ default: m.QuestPage })))
const SessionsPage = lazy(() => import('./pages/SessionsPage').then((m) => ({ default: m.SessionsPage })))
const SessionPage = lazy(() => import('./pages/SessionPage').then((m) => ({ default: m.SessionPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const GodsPage = lazy(() => import('./pages/GodsPage').then((m) => ({ default: m.GodsPage })))
const GodPage = lazy(() => import('./pages/GodPage').then((m) => ({ default: m.GodPage })))

export default function App() {
  return (
    <>
      <div className="screen">
        <Suspense fallback={<Starting />}>
          <Screens />
        </Suspense>
      </div>
      <Footer />
      <UpdatePrompt />
    </>
  )
}

function Screens() {
  const session = useSession()
  const onInvite = useMatch('/invite/:code')
  const onPrivacy = useMatch('/privacy')
  const onTerms = useMatch('/terms')
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
      // The check and the first reads go out together (1.11 A3); when access
      // is refused, the reads are thrown away.
      const allowed = joining ? true : checkAccess()
      // Players see Theros only once they are in a campaign; the DM always does.
      const reads = Promise.all([
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
      reads.catch(() => {}) // a refused user's failed read is not an error
      if (!(await allowed)) {
        if (!cancelled) await signOutWith(INVITE_ONLY)
        return
      }
      const [worlds, profile] = await reads
      // Send changes left over from an earlier visit before any screen loads,
      // so a screen never races its own leftover save (ARCHITECTURE.md 3.4).
      setPendingOwner(user.id)
      await flushAllPending()
      if (cancelled) return
      // A transition, like in useSession: the first screen shows as soon as its file is in.
      startTransition(() =>
        setMe({
          userId: user.id,
          name: profile?.display_name || user.user_metadata.full_name || user.email || '',
          isDm: worlds[0]?.dm_user_id === user.id,
          worldId: worlds[0]?.id ?? null,
          lastCampaignId: profile?.last_campaign_id ?? null,
        }),
      )
    })().catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
    // Only reload when a different person logs in, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (onPrivacy) return <PrivacyPage />
  if (onTerms) return <TermsPage />
  if (onReset) return <ResetPasswordPage />
  if (confirming) return <main className="page center muted">Confirming your email…</main>
  if (session === undefined) return <Starting />
  if (!session) return <LoginPage inviteCode={onInvite?.params.code} notice={authNotice} />
  if (error) return <main className="page center error">{error}</main>
  if (!me) return <Starting />

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
        <Route path="/c/:campaignId/quests" element={<QuestsPage />} />
        <Route path="/c/:campaignId/quests/:questId" element={<QuestPage />} />
        <Route path="/c/:campaignId/sessions" element={<SessionsPage />} />
        <Route path="/c/:campaignId/sessions/:sessionId" element={<SessionPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/gods" element={<GodsPage />} />
        <Route path="/gods/:slug" element={<GodPage />} />
        <Route path="/invite/:code" element={<InvitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MeContext.Provider>
  )
}

/** What shows while the app starts: the same as index.html, so nothing flashes (1.11 A2). */
function Starting() {
  return <main className="page center muted loading">DnD Companion App</main>
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
