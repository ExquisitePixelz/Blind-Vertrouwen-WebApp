// Size check after the build (ARCHITECTURE.md 1.11 D9). Fails the Deploy
// workflow when the files a first visit to the login page downloads grow
// past the limit below. Sizes are compressed (gzip), as GitHub Pages sends
// them. Raising the limit is a deliberate choice: note it in 1.11.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const LIMIT_KB = 173 // 144 KB after Phase 9 step 2, plus about 20%

const dist = resolve(import.meta.dirname, '..', 'dist')
const manifest = JSON.parse(readFileSync(resolve(dist, '.vite', 'manifest.json'), 'utf8'))

// The page itself, its code and styles, and everything they import, plus
// the login screen, which is loaded as soon as the app sees nobody is logged in.
const files = new Set(['index.html'])
const visit = (key) => {
  const chunk = manifest[key]
  if (!chunk || files.has(chunk.file)) return
  files.add(chunk.file)
  for (const css of chunk.css ?? []) files.add(css)
  for (const imported of chunk.imports ?? []) visit(imported)
}
visit('index.html')
visit('src/pages/LoginPage.tsx')

let total = 0
for (const file of files) {
  const size = gzipSync(readFileSync(resolve(dist, file))).length
  total += size
  console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${file}`)
}
const totalKb = total / 1024
console.log(`${totalKb.toFixed(1).padStart(7)} KB  login page in total (limit ${LIMIT_KB} KB)`)
if (totalKb > LIMIT_KB) {
  console.error(`The login page is ${totalKb.toFixed(1)} KB, over the limit of ${LIMIT_KB} KB (ARCHITECTURE.md 1.11 D9).`)
  process.exit(1)
}
