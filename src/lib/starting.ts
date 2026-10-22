import { useEffect, useSyncExternalStore } from 'react'

// Whether the app is still starting, for the start splash (ARCHITECTURE.md
// 1.16): it is while a start screen (App.tsx Starting) shows, and it has
// started once the first real screen replaced them.

let starting = 0
let started = false
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Called by the start screen: the app is still starting while it shows. */
export function useStarting() {
  useEffect(() => {
    starting++
    return () => {
      starting--
      if (starting === 0) started = true
      listeners.forEach((listener) => listener())
    }
  }, [])
}

export const isStarting = () => starting > 0

export function useHasStarted() {
  return useSyncExternalStore(subscribe, () => started && starting === 0)
}
