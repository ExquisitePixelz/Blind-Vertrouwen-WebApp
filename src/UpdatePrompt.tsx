import { useRegisterSW } from 'virtual:pwa-register/react'

// Shown when a new version has been deployed, so nobody stays on an old
// cached copy (ARCHITECTURE.md 3.7).
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-toast" role="status">
      <span>New version available.</span>
      <button onClick={() => updateServiceWorker(true)}>Tap to reload</button>
    </div>
  )
}
