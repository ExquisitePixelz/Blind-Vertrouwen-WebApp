import { createContext, useContext } from 'react'

/** The logged-in user, available to every page once they are logged in. */
export type Me = {
  userId: string
  /** profiles.display_name, shown everywhere in place of the Google name (1.5). */
  name: string
  isDm: boolean
  /** Theros. Always known to the DM; players only see it once they are in a campaign. */
  worldId: string | null
  /** The campaign the dashboard opens on, remembered per account (profiles.last_campaign_id). */
  lastCampaignId: string | null
}

type MeContextValue = { me: Me; update: (patch: Partial<Me>) => void }

export const MeContext = createContext<MeContextValue | null>(null)

function useMeContext(): MeContextValue {
  const value = useContext(MeContext)
  if (!value) throw new Error('useMe() used outside a logged-in page')
  return value
}

export function useMe(): Me {
  return useMeContext().me
}

/** Change the logged-in user's details on screen, after the server saved them. */
export function useUpdateMe() {
  return useMeContext().update
}
