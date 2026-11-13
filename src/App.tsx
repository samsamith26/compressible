import { useState } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { IsentropicCalculator } from '@/features/isentropic/IsentropicCalculator'
import { NormalShockCalculator } from '@/features/normal-shock/NormalShockCalculator'
import { CALCULATORS, isCalcId, type CalcId } from '@/lib/calculators'

const noop = () => {}

export function App() {
  const [calc, setCalc] = useState<CalcId>(new URLSearchParams(location.search).get('calc') === 'normal' ? 'normal' : 'isentropic')

  return (
    <Tabs
      value={calc}
      onValueChange={(v) => {
        if (isCalcId(v)) setCalc(v)
      }}
      className="flex min-h-dvh flex-col gap-0"
    >
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-8 sm:px-6">
        {CALCULATORS.map((c) => (
          <TabsContent key={c.id} value={c.id} className="text-base">
            <h1 className="mb-6 font-heading text-xl font-bold tracking-tight">{c.title}</h1>
            {c.id === 'isentropic' && <IsentropicCalculator initial={{}} onParamsChange={noop} />}
            {c.id === 'normal' && <NormalShockCalculator initial={{}} onParamsChange={noop} />}
          </TabsContent>
        ))}
      </main>
      <Footer />
    </Tabs>
  )
}
