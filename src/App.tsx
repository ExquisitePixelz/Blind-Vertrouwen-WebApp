import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useMatch } from 'react-router'
import { Header } from './components/Header'
import { UpdatePrompt } from './components/UpdatePrompt'
import { MeContext, type Me } from './lib/me'
import { flushAllPending, setPendingOwner } from './lib/saver'
import { must, supabase } from './lib/supabase'
import { useSession } from './lib/useSession'
import { CampaignPage } from './pages/CampaignPage'
import { CharacterPage } from './pages/CharacterPage'
import { CampaignsPage } from './pages/CampaignsPage'
import { GodPage } from './pages/GodPage'
import { GodsPage } from './pages/GodsPage'
import { InvitePage } from './pages/InvitePage'
import { LoginPage } from './pages/LoginPage'

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
    ;(async () => {
      // Players see Theros only once they are in a campaign; the DM always does.
      const worlds = must(await supabase.from('worlds').select('id, dm_user_id').limit(1)) as {
        id: string
        dm_user_id: string | null
      }[]
      // Send changes left over from an earlier visit before any screen loads,
      // so a screen never races its own leftover save (ARCHITECTURE.md 3.4).
      setPendingOwner(user.id)
      await flushAllPending()
      if (cancelled) return
      setMe({
        userId: user.id,
        name: user.user_metadata.full_name ?? user.email ?? '',
        isDm: worlds[0]?.dm_user_id === user.id,
        worldId: worlds[0]?.id ?? null,
      })
    })().catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
    // Only reload when a different person logs in, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (session === undefined) return null
  if (!session) {
    return (
      <LoginPage
        message={onInvite ? 'You have been invited to a Theros campaign. Log in with Google to join.' : undefined}
      />
    )
  }
  if (error) return <main className="page error">{error}</main>
  if (!me) return null

  return (
    <MeContext.Provider value={me}>
      <Header />
      <Routes>
        <Route path="/" element={<CampaignsPage />} />
        <Route path="/c/:campaignId" element={<CampaignPage />} />
        <Route path="/c/:campaignId/characters/:characterId" element={<CharacterPage />} />
        <Route path="/gods" element={<GodsPage />} />
        <Route path="/gods/:slug" element={<GodPage />} />
        <Route path="/invite/:code" element={<InvitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MeContext.Provider>
  )
}
