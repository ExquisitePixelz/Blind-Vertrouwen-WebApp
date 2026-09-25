// The app's version (ARCHITECTURE.md 3.9), from package.json at build time.
// 0.<phase>.<fix>-alpha now; -beta once Character Builder, Quest Journal and
// Live Combat are in; 1.0.0 at release.

declare const __APP_VERSION__: string

export const APP_VERSION = __APP_VERSION__

/** "0.5.0-alpha" → "v0.5.0 Alpha" */
export function versionLabel(version = APP_VERSION) {
  const [number, stage] = version.split('-')
  return stage ? `v${number} ${stage.charAt(0).toUpperCase()}${stage.slice(1)}` : `v${number}`
}
