import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { IsentropicCalculator } from '@/features/isentropic/IsentropicCalculator'
import { NormalShockCalculator } from '@/features/normal-shock/NormalShockCalculator'
import { ObliqueCalculator } from '@/features/oblique-shock/ObliqueCalculator'
import { useCalcRouting } from '@/hooks/useCalcRouting'
import { CALCULATORS, isCalcId } from '@/lib/calculators'

const VIEWS = {
  isentropic: IsentropicCalculator,
  normal: NormalShockCalculator,
  oblique: ObliqueCalculator,
} as const

export function App() {
  const r = useCalcRouting()

  return (
    <Tabs
      value={r.calc}
      onValueChange={(v) => {
        if (isCalcId(v)) r.setCalc(v)
      }}
      className="flex min-h-dvh flex-col gap-0"
    >
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-8 sm:px-6">
        {CALCULATORS.map((c) => {
          const View = VIEWS[c.id]
          return (
            <TabsContent key={c.id} value={c.id} className="text-base">
              <h1 className="mb-6 font-heading text-xl font-bold tracking-tight">{c.title}</h1>
              <View initial={r.initialParams(c.id)} onParamsChange={r.onParamsChange[c.id]} />
            </TabsContent>
          )
        })}
      </main>
      <Footer />
    </Tabs>
  )
}
