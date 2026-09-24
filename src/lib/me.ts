import { createContext, useContext } from 'react'

/** The logged-in user, available to every page once they are logged in. */
export type Me = {
  userId: string
  name: string
  isDm: boolean
  /** Theros. Always known to the DM; players only see it once they are in a campaign. */
  worldId: string | null
}

export const MeContext = createContext<Me | null>(null)

export function useMe(): Me {
  const me = useContext(MeContext)
  if (!me) throw new Error('useMe() used outside a logged-in page')
  return me
}
