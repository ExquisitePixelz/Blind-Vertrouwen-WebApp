import { useEffect, useRef, useState } from 'react'
import type { AnimationItem } from 'lottie-web'
import { animationsOn } from '../lib/animations'
import { isStarting, useHasStarted } from '../lib/starting'

// The loading chest (ARCHITECTURE.md 1.16): the owner's Lottie chest while
// the app starts or a screen's data loads. It only shows when loading is
// slow, so a fast load shows nothing, and it never makes the app wait.

/** How long loading must take before the chest appears. */
const SHOW_AFTER_MS = 400
/** The fade-out at start-up; matches .start-splash.leaving in index.css. */
const FADE_MS = 300

/**
 * The animation itself. The player (the light SVG build of lottie-web) and
 * the chest are their own files, downloaded only now, so the login page does
 * not carry them (1.11 D9). Both stop and go when the chest goes.
 */
function Chest() {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    let animation: AnimationItem | undefined
    Promise.all([import('lottie-web/build/player/lottie_light'), import('../assets/chest.json')])
      .then(([lottie, chest]) => {
        if (cancelled || !box.current) return
        animation = lottie.default.loadAnimation({
          container: box.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          // The player writes into the data it gets, so each chest gets its own copy.
          animationData: structuredClone(chest.default),
        })
      })
      // Without the chest, "Loading…" still shows.
      .catch(() => {})
    return () => {
      cancelled = true
      animation?.destroy()
    }
  }, [])
  return <div ref={box} className="chest" aria-hidden="true" />
}

function useShowAfterDelay() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])
  return shown
}

/** For a screen that is empty while its data loads: the chest under the top bar. */
export function LoadingChest() {
  const shown = useShowAfterDelay()
  if (!shown) return null
  return (
    <div className="loading-chest" role="status">
      {animationsOn() && <Chest />}
      <p className="muted">Loading…</p>
    </div>
  )
}

/**
 * The chest at start-up, over the plain start text: on a cold start only, and
 * only when starting is slow. It fades out as soon as the first screen is
 * ready, and a tap hides it.
 */
export function StartSplash() {
  const hasStarted = useHasStarted()
  const [state, setState] = useState<'waiting' | 'shown' | 'leaving' | 'gone'>(() =>
    animationsOn() ? 'waiting' : 'gone',
  )

  useEffect(() => {
    if (state !== 'waiting') return
    const timer = setTimeout(() => setState(isStarting() ? 'shown' : 'gone'), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [state])

  useEffect(() => {
    if (state === 'leaving') {
      const timer = setTimeout(() => setState('gone'), FADE_MS)
      return () => clearTimeout(timer)
    }
  }, [state])

  // Started: the splash goes for good. Updating state during render is how
  // React follows a store without an extra screen update.
  if (hasStarted && (state === 'waiting' || state === 'shown')) setState(state === 'waiting' ? 'gone' : 'leaving')

  if (state !== 'shown' && state !== 'leaving') return null
  return (
    <div className={`start-splash${state === 'leaving' ? ' leaving' : ''}`} role="status" onClick={() => setState('leaving')}>
      <Chest />
      <p className="muted">Loading…</p>
    </div>
  )
}
