/**
 * End-to-end UI checks with Playwright against a production build.
 *
 * Run: npm run verify:ui   (builds first). Screenshots go to verification/ (gitignored).
 * Set CHROMIUM_PATH to use a pre-installed browser instead of Playwright's download.
 */

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'
import { preview } from 'vite'

const OUT = join(import.meta.dirname, '..', 'verification')
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
] as const
const SCHEMES = ['light', 'dark'] as const
const CALCS = ['isentropic', 'normal', 'oblique'] as const

let failures = 0
function check(ok: boolean, what: string): void {
  console.log(`${ok ? '  ✓' : '  ✗'} ${what}`)
  if (!ok) failures++
}

async function readout(page: Page, label: string): Promise<string> {
  const row = page.locator('dl > div').filter({ has: page.locator('dt', { hasText: label }) }).first()
  return (await row.locator('dd').innerText()).trim()
}

async function openPage(browser: Browser, base: string, path: string, width: number, scheme: 'light' | 'dark') {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(base + path)
  await page.waitForLoadState('networkidle')
  return { page, errors }
}

async function layoutChecks(browser: Browser, base: string): Promise<void> {
  console.log('Layout, theme and console errors')
  for (const vp of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      for (const calc of CALCS) {
        const { page, errors } = await openPage(browser, base, `/?calc=${calc}`, vp.width, scheme)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
        check(overflow <= 0, `${calc} ${vp.name} ${scheme}: no horizontal scroll (${overflow}px)`)
        check(dark === (scheme === 'dark'), `${calc} ${vp.name} ${scheme}: follows system theme`)
        check(errors.length === 0, `${calc} ${vp.name} ${scheme}: no console errors ${errors.join('; ')}`)
        await page.screenshot({ path: join(OUT, `${calc}-${vp.name}-${scheme}.png`), fullPage: true })
        await page.close()
      }
    }
  }
}

async function behaviourChecks(browser: Browser, base: string): Promise<void> {
  console.log('Behaviour')
  const { page } = await openPage(browser, base, '/?calc=isentropic', 1280, 'light')

  // Live update, no Calculate button.
  const field = page.getByRole('textbox', { name: /^M\b/ })
  await field.fill('3')
  check((await readout(page, 'p/p₀')).startsWith('0.027224'), 'isentropic updates live (M=3 → p/p₀ 0.027224)')
  check((await page.getByRole('button', { name: /calculate/i }).count()) === 0, 'no Calculate button')

  // Inline error, results kept.
  await field.fill('-1')
  check((await field.getAttribute('aria-invalid')) === 'true', 'invalid value marks the field aria-invalid')
  check(await page.getByText(/M must be between 0/).isVisible(), 'physics error message shown inline')
  check((await readout(page, 'p/p₀')).startsWith('0.027224'), 'last valid results stay visible')

  // Keyboard: arrow keys nudge the field, Tab order reaches the chart marker.
  await field.fill('2')
  await field.press('ArrowUp')
  check((await field.inputValue()) === '2.1', 'ArrowUp nudges 2 → 2.1')
  await page.keyboard.press('Tab')
  check((await page.evaluate(() => document.activeElement?.getAttribute('inputmode'))) === 'decimal', 'Tab moves to γ')
  const marker = page.getByRole('slider', { name: 'Mach number' })
  await marker.focus()
  await marker.press('ArrowRight')
  check((await field.inputValue()) === '2.2', 'chart marker responds to ArrowRight')

  // Kind switch converts the value.
  await page.getByRole('combobox', { name: 'Known quantity' }).selectOption('pP0')
  check((await page.getByRole('textbox', { name: /p\/p₀/ }).inputValue()).startsWith('0.0935'), 'switching kind converts M=2.2 to p/p₀')

  // URL round trip.
  const url = page.url()
  await page.reload()
  check((await page.getByRole('textbox', { name: /p\/p₀/ }).inputValue()).startsWith('0.0935'), `state survives reload (${new URL(url).search})`)

  // Theme toggle.
  await page.getByRole('button', { name: /switch to dark theme/i }).click()
  check(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'theme toggle switches to dark')
  await page.close()

  // Oblique: drag the θ-β-M point, keyboard, detachment.
  const ob = await openPage(browser, base, '/?calc=oblique', 1280, 'light')
  const p = ob.page
  const point = p.getByRole('slider', { name: /Wave angle/ })
  const before = await readout(p, 'β')
  // The slider group includes its crosshair lines; grab the dot itself.
  const dot = point.locator('circle').last()
  await dot.scrollIntoViewIfNeeded()
  const box = await dot.boundingBox()
  if (box === null) throw new Error('θ-β-M point not rendered')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await p.mouse.move(cx, cy)
  await p.mouse.down()
  await p.mouse.move(cx + 60, cy - 40, { steps: 8 })
  await p.mouse.up()
  const after = await readout(p, 'β')
  check(after !== before, `dragging the θ-β-M point changes β (${before} → ${after})`)
  check(p.url().includes('ob.v='), 'drag writes the new state to the URL')

  await point.focus()
  const kb = await readout(p, 'β')
  await point.press('Shift+ArrowUp')
  check((await readout(p, 'β')) !== kb, 'θ-β-M point responds to Shift+ArrowUp')

  await p.getByRole('combobox', { name: 'Known quantity' }).selectOption('thetaWeak')
  await p.getByRole('textbox', { name: /θ, weak shock/ }).fill('25')
  check(await p.getByText('Shock detached').isVisible(), 'θ > θmax shows the detached notice')
  check((await p.getByRole('img', { name: /Detached bow shock/ }).count()) === 1, 'wedge diagram draws the bow shock')
  await p.screenshot({ path: join(OUT, 'oblique-detached.png'), fullPage: true })

  await p.getByRole('textbox', { name: /^M₁/ }).fill('0.8')
  check(await p.getByText(/M1 must be/).isVisible(), 'subsonic M₁ error appears on the M₁ field')
  await p.close()
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  const server = await preview({ preview: { port: 4174, strictPort: true }, logLevel: 'warn' })
  const base = 'http://localhost:4174'
  const executablePath = process.env['CHROMIUM_PATH']
  const browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
  try {
    await layoutChecks(browser, base)
    await behaviourChecks(browser, base)
  } finally {
    await browser.close()
    await server.close()
  }
  console.log(failures === 0 ? '\nAll UI checks passed.' : `\n${failures} UI check(s) failed.`)
  process.exit(failures === 0 ? 0 : 1)
}

await main()
