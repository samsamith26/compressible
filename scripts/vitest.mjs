// Launch Vitest from an upper-case drive path on Windows.
// A lowercase cwd (c:\ vs C:\, as VS Code and some shells report it) makes Vitest
// load two module instances and fail with "failed to find the current suite".
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase())
const bin = join(cwd, 'node_modules', 'vitest', 'vitest.mjs')
const run = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { cwd, stdio: 'inherit' })
process.exit(run.status ?? 1)
