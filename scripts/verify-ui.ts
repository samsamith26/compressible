/**
 * End-to-end UI verification against the production build (CLAUDE.md: verify UI
 * changes with Playwright, including at mobile width).
 *
 * Run: npm run verify:ui   (builds first). Screenshots land in verification/.
 * Exits non-zero if any check fails.
 */

import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Page } from 'playwright'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'verification')
const PORT = 4179
const BASE = `http://localhost:${PORT}/`
const CALCS = ['isentropic', 'normal', 'oblique'] as const
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812 },
] as const

const failures: string[] = []
function check(ok: boolean, what: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`)
  if (!ok) failures.push(what)
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('preview server did not start')
}

function param(page: Page, key: string): string | null {
  return new URL(page.url()).searchParams.get(key)
}

async function sweep(page: Page, errors: string[]) {
  for (const vp of VIEWPORTS) {
    for (const theme of ['light', 'dark'] as const) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.emulateMedia({ colorScheme: theme })
      for (const calc of CALCS) {
        await page.goto(`${BASE}?calc=${calc}`)
        await page.evaluate(() => localStorage.clear())
        await page.reload()
        await page.getByRole('heading', { level: 1 }).waitFor()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        check(overflow <= 0, `${calc} ${vp.name} ${theme}: no horizontal scroll (overflow ${overflow}px)`)
        const applied = await page.evaluate(() => document.documentElement.dataset.theme)
        check(applied === theme, `${calc} ${vp.name} ${theme}: theme follows the system (${applied})`)
        await page.screenshot({ path: join(OUT, `${calc}-${vp.name}-${theme}.png`), fullPage: true })
      }
    }
  }
  check(errors.length === 0, `no console errors across the sweep${errors.length ? `: ${errors.join(' | ')}` : ''}`)
}

async function interactions(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.emulateMedia({ colorScheme: 'light' })

  // Live typing updates results, and the URL follows.
  await page.goto(`${BASE}?calc=isentropic`)
  await page.getByRole('textbox', { name: 'M', exact: true }).fill('3')
  const p = await page.getByRole('table', { name: /ratios/i }).getByRole('row', { name: 'p' }).getByRole('cell').first().textContent()
  check(p === '0.027224', `isentropic: typing M = 3 updates p/p0 live (${p})`)
  check(param(page, 'v') === '3', 'isentropic: the URL mirrors the typed value')

  // Half-typed input shows no error.
  await page.getByRole('textbox', { name: 'M', exact: true }).fill('2.')
  check((await page.getByRole('alert').count()) === 0, 'isentropic: half-typed "2." shows no error')

  // Keyboard: Tab reaches every input and slider on the oblique calculator.
  await page.goto(`${BASE}?calc=oblique`)
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  const reached = new Set<string>()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const label = await page.evaluate(() => {
      const el = document.activeElement
      return el?.getAttribute('aria-label') ?? el?.id ?? el?.tagName ?? ''
    })
    reached.add(label)
  }
  for (const want of ['γ', 'M1', 'θ', 'ob-kind', 'Wave angle β on the θ-β-M chart']) {
    check(reached.has(want), `oblique: Tab reaches "${want}"`)
  }

  // Keyboard on the θ-β-M slider changes θ while keeping a turn-angle input.
  await page.goto(`${BASE}?calc=oblique`)
  const slider = page.getByRole('slider', { name: /wave angle/i })
  await slider.focus()
  await page.keyboard.press('Shift+ArrowRight')
  check(param(page, 'k') === 'thetaWeak' && Number(param(page, 'v')) > 10, `oblique: arrow key moves the operating point (θ ${param(page, 'v')})`)

  // Mouse drag on the θ-β-M point.
  await page.goto(`${BASE}?calc=oblique`)
  const point = page.getByRole('slider', { name: /wave angle/i })
  await point.scrollIntoViewIfNeeded()
  const box = await point.boundingBox()
  if (box === null) {
    check(false, 'oblique: θ-β-M point is visible for dragging')
  } else {
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 40, cy, { steps: 5 })
    await page.mouse.move(cx + 260, cy, { steps: 10 })
    await page.mouse.up()
    check(param(page, 'k') === 'thetaStrong', `oblique: dragging past β at θmax switches to the strong solution (k=${param(page, 'k')}, θ=${param(page, 'v')})`)
  }

  // Detachment is a status, not an error.
  await page.goto(`${BASE}?calc=oblique&m1=2&k=thetaWeak&v=30`)
  const status = (await page.getByRole('status').textContent()) ?? ''
  check(/Shock detached/.test(status) && (await page.getByRole('alert').count()) === 0, 'oblique: θ = 30° at M1 = 2 shows the detached status')
  await page.screenshot({ path: join(OUT, 'oblique-detached.png'), fullPage: true })

  // Reloading a shared URL restores its inputs.
  await page.goto(`${BASE}?calc=normal&g=1.3&k=p2P1&v=5`)
  await page.reload()
  check((await page.getByRole('textbox', { name: 'p2/p1' }).inputValue()) === '5' && (await page.getByRole('textbox', { name: 'γ' }).inputValue()) === '1.3', 'normal: reload restores γ and p2/p1 from the URL')

  // Theme toggle persists across reloads.
  await page.goto(BASE)
  await page.getByRole('button', { name: /switch to dark theme/i }).click()
  await page.reload()
  check((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'theme toggle choice survives a reload')
  await page.evaluate(() => localStorage.clear())

  // Tabs switch calculators and update the URL.
  await page.goto(BASE)
  await page.getByRole('tab', { name: /oblique/i }).click()
  check(param(page, 'calc') === 'oblique', 'clicking a calculator tab updates ?calc')

  // Footer credit.
  const credit = page.getByRole('link', { name: /Virginia Tech Compressible Aerodynamics Calculator/ })
  check((await credit.getAttribute('href')) === 'https://devenport.aoe.vt.edu/aoe3114/calc.html', 'footer credits the VT calculator')
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const cwd = ROOT.replace(/^[a-z]:/, (d) => d.toUpperCase())
  const server = spawn(process.execPath, [join(cwd, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd, stdio: 'ignore' })
  try {
    await waitForServer()
    const browser = await chromium.launch()
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(e.message))
    await sweep(page, errors)
    await interactions(page)
    check(errors.length === 0, `no console errors during interactions${errors.length ? `: ${errors.join(' | ')}` : ''}`)
    await browser.close()
  } finally {
    server.kill()
  }
  console.log(failures.length === 0 ? '\nAll UI checks passed.' : `\n${failures.length} UI check(s) failed.`)
  process.exit(failures.length === 0 ? 0 : 1)
}

await main()
