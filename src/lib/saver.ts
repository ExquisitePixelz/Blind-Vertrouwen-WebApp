// Online-first saving (ARCHITECTURE.md 3.4).
//
// * Changes are sent about a second after the user stops typing, and at once
//   for taps (pick lists, number dialogs) and when the page is hidden or closed.
// * Until the server confirms a save, the unsent change is kept in the
//   browser's localStorage, and sent again on the next visit or when the
//   connection comes back. After confirmation it is deleted.
// * Every save sends the row's version. If someone else saved in between, the
//   database refuses it (HTTP 409) and the user chooses: keep mine, or use theirs.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type Row = { id: string; version: number }
type Patch = Record<string, unknown>
type Pending = { table: string; id: string; baseVersion: number; patch: Patch }

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'conflict'

const ROOT = 'theros:pending:'
let owner = 'nobody'
// Keys include the user, so on a shared phone one person's unsent changes are
// never sent or shown under someone else's login.
const prefix = () => `${ROOT}${owner}:`

/** Call once the logged-in user is known. */
export function setPendingOwner(userId: string) {
  owner = userId
}
const DELAY_MS = 1000

const storageKey = (table: string, id: string) => `${prefix()}${table}:${id}`

function readPending(table: string, id: string): Pending | null {
  try {
    const raw = localStorage.getItem(storageKey(table, id))
    return raw ? (JSON.parse(raw) as Pending) : null
  } catch {
    return null
  }
}

function writePending(p: Pending) {
  try {
    localStorage.setItem(storageKey(p.table, p.id), JSON.stringify(p))
  } catch {
    // Storage full or blocked: the save still goes out, just without the safety copy.
  }
}

function clearPending(table: string, id: string) {
  try {
    localStorage.removeItem(storageKey(table, id))
  } catch {
    // ignore
  }
}

class ConflictError extends Error {}

async function send<T extends Row>(table: string, id: string, baseVersion: number, patch: Patch): Promise<T> {
  const result = await supabase
    .from(table)
    .update({ ...patch, version: baseVersion })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (result.error) {
    if (result.status === 409) throw new ConflictError(result.error.message)
    throw new Error(result.error.message)
  }
  if (!result.data) throw new Error('You are not allowed to change this.')
  return result.data as T
}

/**
 * Send every change still waiting in this browser (from an earlier visit,
 * or from before the connection dropped). Conflicts stay stored; the edit
 * screen shows them when it is opened.
 */
export async function flushAllPending() {
  const waiting: Pending[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(prefix())) continue
      const p = JSON.parse(localStorage.getItem(key) ?? 'null') as Pending | null
      if (p) waiting.push(p)
    }
  } catch {
    return
  }
  for (const p of waiting) {
    try {
      await send(p.table, p.id, p.baseVersion, p.patch)
      clearPending(p.table, p.id)
    } catch {
      // Still offline, or a conflict: leave it for later.
    }
  }
}

/**
 * Edit one row with autosave. `view` is the row with unsent changes applied;
 * show that, not `row`. `onSaved` receives the row as the server stored it.
 */
export function useRowSaver<T extends Row>(table: string, row: T | undefined, onSaved: (row: T) => void) {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [local, setLocal] = useState<Patch>({})
  const id = row?.id

  const version = useRef<number | null>(null) // last version confirmed by the server
  const draft = useRef<Patch>({}) // changes not sent yet
  const inflight = useRef<Patch | null>(null) // changes on their way
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const running = useRef<Promise<void> | null>(null) // the save loop, while it runs
  const savedCallback = useRef(onSaved)
  useEffect(() => {
    savedCallback.current = onSaved
  })

  const persist = useCallback(() => {
    if (!id || version.current === null) return
    const patch = { ...inflight.current, ...draft.current }
    if (Object.keys(patch).length) writePending({ table, id, baseVersion: version.current, patch })
    else clearPending(table, id)
  }, [table, id])

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!id || version.current === null || inflight.current || !Object.keys(draft.current).length) return

    setStatus('saving')
    const run = (async () => {
      try {
        // Keep sending until nothing new was typed while the last save was on its way.
        while (Object.keys(draft.current).length) {
          inflight.current = draft.current
          draft.current = {}
          const saved: T = await send<T>(table, id, version.current!, inflight.current)
          version.current = saved.version
          inflight.current = null
          persist()
          savedCallback.current(saved)
        }
        setLocal({})
        setStatus('saved')
      } catch (e) {
        // Put the changes back so nothing typed is lost.
        draft.current = { ...inflight.current, ...draft.current }
        inflight.current = null
        setStatus(e instanceof ConflictError ? 'conflict' : 'unsaved')
      }
    })()
    running.current = run
    await run
    if (running.current === run) running.current = null
  }, [table, id, persist])

  /**
   * Send everything now and wait until it has reached the server. `saved` is
   * false when something could not be sent (offline, conflict); `version` is
   * the row's version on the server.
   */
  const settle = useCallback(async () => {
    while (running.current) await running.current
    await flush()
    while (running.current) await running.current
    return { saved: !inflight.current && !Object.keys(draft.current).length, version: version.current }
  }, [flush])

  // Adopt the server's version whenever the row is (re)loaded and nothing is
  // waiting; pick up changes left over from an earlier visit.
  useEffect(() => {
    if (!row) return
    if (version.current === null) {
      const leftover = readPending(table, row.id)
      if (leftover) {
        // Syncing with localStorage (outside React) is what this effect is for.
        /* eslint-disable react/set-state-in-effect */
        version.current = leftover.baseVersion
        draft.current = leftover.patch
        setLocal(leftover.patch)
        setStatus('unsaved')
        /* eslint-enable react/set-state-in-effect */
        void flush()
        return
      }
    }
    if (!inflight.current && !Object.keys(draft.current).length) version.current = row.version
  }, [row, table, flush])

  // Save at once when the page is hidden or closed, or when the connection returns.
  useEffect(() => {
    const now = () => void flush()
    const onHide = () => {
      if (document.visibilityState === 'hidden') now()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', now)
    window.addEventListener('online', now)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', now)
      window.removeEventListener('online', now)
      now() // leaving the screen
    }
  }, [flush])

  /** Record a change. `immediate` for taps; typing waits for a pause. */
  const change = useCallback(
    (patch: Patch, immediate = false) => {
      draft.current = { ...draft.current, ...patch }
      setLocal((l) => ({ ...l, ...patch }))
      persist()
      if (status !== 'conflict') setStatus('unsaved')
      if (timer.current) clearTimeout(timer.current)
      if (immediate) void flush()
      else timer.current = setTimeout(() => void flush(), DELAY_MS)
    },
    [persist, flush, status],
  )

  /** Conflict: save my changes on top of the newer version. */
  const keepMine = useCallback(async () => {
    if (!id) return
    const current = await supabase.from(table).select('version').eq('id', id).maybeSingle()
    if (current.error || !current.data) {
      setStatus('unsaved')
      return
    }
    version.current = (current.data as { version: number }).version
    persist()
    setStatus('unsaved')
    await flush()
  }, [table, id, persist, flush])

  /** Conflict: throw my changes away and show the newer version. */
  const discardMine = useCallback(
    (reload: () => void) => {
      if (!id) return
      draft.current = {}
      inflight.current = null
      version.current = null
      clearPending(table, id)
      setLocal({})
      setStatus('saved')
      reload()
    },
    [table, id],
  )

  const view = row ? ({ ...row, ...local } as T) : undefined
  return { view, status, change, flush, settle, keepMine, discardMine }
}
