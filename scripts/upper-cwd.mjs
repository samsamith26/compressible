// Run a Node CLI (Vite, Vitest) from an upper-case drive path on Windows.
// A lowercase cwd (c:\ vs C:\, as VS Code and some shells report it) makes these
// tools resolve the same module under two paths: Vitest then loads twice ("failed
// to find the current suite") and Vite bundles React twice ("Invalid hook call").
//
// Usage: node scripts/upper-cwd.mjs <script under node_modules> [args...]
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const [script, ...args] = process.argv.slice(2)
if (script === undefined) {
  console.error('usage: node scripts/upper-cwd.mjs <node_modules script> [args...]')
  process.exit(2)
}
const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase())
const run = spawnSync(process.execPath, [join(cwd, script), ...args], { cwd, stdio: 'inherit' })
process.exit(run.status ?? 1)
