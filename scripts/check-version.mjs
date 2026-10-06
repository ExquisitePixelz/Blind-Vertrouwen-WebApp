// Version check before the build (ARCHITECTURE.md 3.9, owner 2026-10-07).
// Every push that changes the website must raise the version in
// package.json, so the footer always changes when phones show "New version".
// A push that only changes the plan, tests or database files needs none.

import { execSync } from 'node:child_process'

const before = process.env.BEFORE ?? ''
const sh = (command) => execSync(command, { encoding: 'utf8' })

if (!before || /^0+$/.test(before)) {
  console.log('No earlier commit to compare with (first push or manual run): skipped.')
  process.exit(0)
}

let changed
try {
  changed = sh(`git diff --name-only ${before} HEAD`).split('\n').filter(Boolean)
} catch {
  console.log(`The earlier commit ${before} is not available (history rewritten?): skipped.`)
  process.exit(0)
}

// What the website is built from.
const SITE = [/^src\//, /^public\//, /^index\.html$/, /^vite\.config\.ts$/, /^package(-lock)?\.json$/, /^tsconfig.*\.json$/]
const site = changed.filter((file) => SITE.some((pattern) => pattern.test(file)))
if (!site.length) {
  console.log('No website files changed: no new version needed.')
  process.exit(0)
}

const version = (ref) => JSON.parse(sh(`git show ${ref}:package.json`)).version
const old = version(before)
const now = version('HEAD')
if (old === now) {
  console.error(`The website changed but the version is still ${now} (ARCHITECTURE.md 3.9). Raise it in package.json and package-lock.json. Changed:`)
  for (const file of site) console.error(`  ${file}`)
  process.exit(1)
}
console.log(`Website changed, version ${old} → ${now}.`)
