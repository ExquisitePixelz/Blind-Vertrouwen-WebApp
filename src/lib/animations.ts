// The Animations setting (ARCHITECTURE.md 1.16): per device, so it lives in
// this browser's storage, not the database. Until it is set, it follows the
// phone: off when the phone asks for less motion, on otherwise.

const KEY = 'theros:animations'

export function animationsOn(): boolean {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return stored === 'on'
  } catch {
    // Storage blocked: follow the phone.
  }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function setAnimationsOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
}
