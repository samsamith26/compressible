/**
 * Records input/output pairs from the Virginia Tech Compressible Aerodynamics
 * Calculator (https://devenport.aoe.vt.edu/aoe3114/calc.html) for use as test
 * fixtures. Only the displayed numbers are stored; none of VT's code is copied.
 *
 * Inputs are generated from our own forward relations and rounded to 4 significant
 * figures so every case is in range for each γ; the expected outputs come from VT.
 *
 * Run: npm run fixtures:vt
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Page } from 'playwright'
import {
  isentropicFromMach,
  machAngleDeg,
  maxDeflection,
  normalShock,
  obliqueFromTheta,
  type Result,
} from '../src/physics/index.ts'

const URL = 'https://devenport.aoe.vt.edu/aoe3114/calcbody.html'
const OUT_DIR = join(import.meta.dirname, '..', 'src', 'physics', '__tests__', 'fixtures')
const GAMMAS = [1.2, 1.4, 1.67]

export interface VtFixture {
  gamma: number
  m1?: number
  inputKind: string
  inputValue: number
  /** Raw strings exactly as VT displayed them; null when VT raised an alert. */
  outputs: Record<string, string> | null
  alert?: string
}

/** VT output field name → our state field name, per form. */
const ISENTROPIC_FIELDS = {
  m: 'mach',
  mu: 'machAngleDeg',
  nu: 'prandtlMeyerDeg',
  pp0: 'pP0',
  rr0: 'rhoRho0',
  tt0: 'tT0',
  pps: 'pPStar',
  rrs: 'rhoRhoStar',
  tts: 'tTStar',
  aas: 'aAStar',
} as const
const NORMAL_FIELDS = {
  m1: 'm1',
  m2: 'm2',
  p02p01: 'p02P01',
  p1p02: 'p1P02',
  p2p1: 'p2P1',
  r2r1: 'rho2Rho1',
  t2t1: 't2T1',
} as const
const OBLIQUE_FIELDS = {
  m2: 'm2',
  delta: 'thetaDeg',
  beta: 'betaDeg',
  p2p1: 'p2P1',
  r2r1: 'rho2Rho1',
  t2t1: 't2T1',
  p02p01: 'p02P01',
  m1n: 'm1n',
  m2n: 'm2n',
} as const

/** Option order in each VT <select>; matches our input-kind unions. */
const ISENTROPIC_KINDS = ['mach', 'tT0', 'pP0', 'rhoRho0', 'areaSub', 'areaSup', 'machAngleDeg', 'prandtlMeyerDeg'] as const
const NORMAL_KINDS = ['m1', 'm2', 'p2P1', 'rho2Rho1', 't2T1', 'p02P01', 'p1P02'] as const
const OBLIQUE_KINDS = ['thetaWeak', 'thetaStrong', 'beta', 'm1n'] as const

function sig4(x: number): number {
  return Number(x.toPrecision(4))
}

function must<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error.message)
  return r.value
}

interface Case {
  form: number
  gamma: number
  m1?: number
  kindIndex: number
  inputKind: string
  inputValue: number
  fields: Readonly<Record<string, string>>
}

function isentropicCases(gamma: number): Case[] {
  const s = (m: number) => must(isentropicFromMach(m, gamma))
  const valid: Record<(typeof ISENTROPIC_KINDS)[number], number[]> = {
    mach: [0.5, 2, 4],
    tT0: [0.5, 2, 4].map((m) => sig4(s(m).tT0)),
    pP0: [0.5, 2, 4].map((m) => sig4(s(m).pP0)),
    rhoRho0: [0.5, 2, 4].map((m) => sig4(s(m).rhoRho0)),
    areaSub: [0.2, 0.5, 0.9].map((m) => sig4(s(m).aAStar)),
    areaSup: [1.5, 2, 4].map((m) => sig4(s(m).aAStar)),
    machAngleDeg: [20, 45, 80],
    prandtlMeyerDeg: [10, 40, 80],
  }
  const invalid: Record<(typeof ISENTROPIC_KINDS)[number], number> = {
    mach: -1,
    tT0: 1.5,
    pP0: 1.5,
    rhoRho0: 1.5,
    areaSub: 0.5,
    areaSup: 0.5,
    machAngleDeg: 95,
    prandtlMeyerDeg: 200,
  }
  return ISENTROPIC_KINDS.flatMap((kind, kindIndex) =>
    [...valid[kind], invalid[kind]].map((inputValue) => ({
      form: 0,
      gamma,
      kindIndex,
      inputKind: kind,
      inputValue,
      fields: ISENTROPIC_FIELDS,
    })),
  )
}

function normalCases(gamma: number): Case[] {
  const machs = [1.5, 2, 5]
  const s = (m: number) => must(normalShock(m, gamma))
  const valid: Record<(typeof NORMAL_KINDS)[number], number[]> = {
    m1: machs,
    m2: machs.map((m) => sig4(s(m).m2)),
    p2P1: machs.map((m) => sig4(s(m).p2P1)),
    rho2Rho1: machs.map((m) => sig4(s(m).rho2Rho1)),
    t2T1: machs.map((m) => sig4(s(m).t2T1)),
    p02P01: machs.map((m) => sig4(s(m).p02P01)),
    p1P02: machs.map((m) => sig4(s(m).p1P02)),
  }
  const invalid: Record<(typeof NORMAL_KINDS)[number], number> = {
    m1: 0.5,
    m2: 1.5,
    p2P1: 0.5,
    rho2Rho1: 0.5,
    t2T1: 0.5,
    p02P01: 1.5,
    p1P02: 0.9,
  }
  return NORMAL_KINDS.flatMap((kind, kindIndex) =>
    [...valid[kind], invalid[kind]].map((inputValue) => ({
      form: 1,
      gamma,
      kindIndex,
      inputKind: kind,
      inputValue,
      fields: NORMAL_FIELDS,
    })),
  )
}

function obliqueCases(gamma: number): Case[] {
  return [1.5, 2, 5].flatMap((m1) => {
    const max = must(maxDeflection(m1, gamma))
    const mu = machAngleDeg(m1)
    const mid = must(obliqueFromTheta(m1, max.thetaMaxDeg * 0.5, gamma))
    if (mid.kind !== 'attached') throw new Error('expected attached')
    const valid: Record<(typeof OBLIQUE_KINDS)[number], number[]> = {
      thetaWeak: [0.3, 0.7].map((f) => sig4(max.thetaMaxDeg * f)),
      thetaStrong: [0.3, 0.7].map((f) => sig4(max.thetaMaxDeg * f)),
      beta: [sig4(mid.weak.betaDeg), sig4(mu + 0.8 * (90 - mu))],
      m1n: [0.3, 0.7].map((f) => sig4(1 + f * (m1 - 1))),
    }
    const cases: Case[] = OBLIQUE_KINDS.flatMap((kind, kindIndex) =>
      valid[kind].map((inputValue) => ({
        form: 2,
        gamma,
        m1,
        kindIndex,
        inputKind: kind,
        inputValue,
        fields: OBLIQUE_FIELDS,
      })),
    )
    cases.push({
      form: 2,
      gamma,
      m1,
      kindIndex: 0,
      inputKind: 'thetaWeak',
      inputValue: sig4(max.thetaMaxDeg * 1.1),
      fields: OBLIQUE_FIELDS,
    })
    return cases
  })
}

async function record(page: Page, c: Case, alerts: string[]): Promise<VtFixture> {
  const form = page.locator('form').nth(c.form)
  // Clear outputs so a rejected input cannot leave stale values behind.
  for (const vtName of Object.keys(c.fields)) await form.locator(`input[name="${vtName}"]`).fill('')
  await form.locator('input[name="g"]').fill(String(c.gamma))
  if (c.m1 !== undefined) await form.locator('input[name="m"]').fill(String(c.m1))
  await form.locator('select[name="i"]').selectOption({ index: c.kindIndex })
  await form.locator(c.form === 2 ? 'input[name="a"]' : 'input[name="v"]').fill(String(c.inputValue))
  alerts.length = 0
  await form.locator('input[type="button"]').click()

  const base = {
    gamma: c.gamma,
    ...(c.m1 === undefined ? {} : { m1: c.m1 }),
    inputKind: c.inputKind,
    inputValue: c.inputValue,
  }
  const alert = alerts[0]
  if (alert !== undefined) return { ...base, outputs: null, alert }

  const outputs: Record<string, string> = {}
  for (const [vtName, ours] of Object.entries(c.fields)) {
    outputs[ours] = (await form.locator(`input[name="${vtName}"]`).inputValue()).trim()
  }
  return { ...base, outputs }
}

async function main(): Promise<void> {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const alerts: string[] = []
  page.on('dialog', (d) => {
    alerts.push(d.message())
    void d.dismiss()
  })
  await page.goto(URL)

  const groups = {
    'vt-isentropic.json': GAMMAS.flatMap(isentropicCases),
    'vt-normal-shock.json': GAMMAS.flatMap(normalCases),
    'vt-oblique.json': GAMMAS.flatMap(obliqueCases),
  }
  mkdirSync(OUT_DIR, { recursive: true })
  for (const [file, cases] of Object.entries(groups)) {
    const fixtures: VtFixture[] = []
    for (const c of cases) fixtures.push(await record(page, c, alerts))
    writeFileSync(join(OUT_DIR, file), JSON.stringify(fixtures, null, 2) + '\n')
    const rejected = fixtures.filter((f) => f.outputs === null).length
    console.log(`${file}: ${fixtures.length} cases (${rejected} rejected by VT)`)
  }
  await browser.close()
}

await main()
