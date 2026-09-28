import { useRef, type ReactNode } from 'react'

const LONG_PRESS_MS = 500

/**
 * A tappable area that also knows a long-press (about half a second, with a
 * finger or a mouse button; ARCHITECTURE.md 1.10). Without either handler it
 * is plain, untappable content (B4: nothing opens on a read-only sheet).
 */
export function Press({
  onTap,
  onLongPress,
  className,
  label,
  children,
}: {
  onTap?: () => void
  onLongPress?: () => void
  className?: string
  /** Accessible name, when the content alone does not say what it opens. */
  label?: string
  children: ReactNode
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)

  if (!onTap && !onLongPress) return <div className={className}>{children}</div>

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  return (
    <button
      type="button"
      aria-label={label}
      className={`tappable press ${className ?? ''}`}
      onPointerDown={() => {
        fired.current = false
        cancel()
        if (onLongPress) {
          timer.current = setTimeout(() => {
            fired.current = true
            onLongPress()
          }, LONG_PRESS_MS)
        }
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => {
        // A long-press on a phone also opens the browser's menu; not here.
        if (onLongPress) e.preventDefault()
      }}
      onClick={() => {
        if (fired.current) {
          fired.current = false
          return
        }
        ;(onTap ?? onLongPress)?.()
      }}
    >
      {children}
    </button>
  )
}
