import { useCallback, useEffect, useRef, useState } from 'react'

type LoadState<T> = { data: T | undefined; error: string | null; loading: boolean }

/** A return to the tab within this long of the last load does not reload (1.11, owner decision 1). */
const FRESH_MS = 30_000

/**
 * Load data when the screen opens, and again when the user returns to the
 * tab (ARCHITECTURE.md 3.6: no realtime, refresh on open and on return),
 * unless it loaded less than 30 seconds ago.
 */
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<LoadState<T>>({ data: undefined, error: null, loading: true })
  const latest = useRef(0)
  const loadedAt = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(load, deps)

  const run = useCallback(async () => {
    const request = ++latest.current
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await reload()
      if (request === latest.current) {
        loadedAt.current = Date.now()
        setState({ data, error: null, loading: false })
      }
    } catch (e) {
      if (request === latest.current) {
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e), loading: false }))
      }
    }
  }, [reload])

  useEffect(() => {
    run()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - loadedAt.current >= FRESH_MS) run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [run])

  /** Change the loaded data locally, e.g. after a save returned the new row. */
  const mutate = useCallback((update: (data: T | undefined) => T | undefined) => {
    latest.current++ // an older load still on its way must not overwrite this
    setState((s) => ({ ...s, data: update(s.data) }))
  }, [])

  return { ...state, reload: run, mutate }
}

/** What useLoad returns, to hand loaded data to a child component. */
export type Loaded<T> = ReturnType<typeof useLoad<T>>
