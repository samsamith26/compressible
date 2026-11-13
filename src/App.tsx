import { useState } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { CALCULATORS, isCalcId, type CalcId } from '@/lib/calculators'

export function App() {
  const [calc, setCalc] = useState<CalcId>('isentropic')

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
            <h1 className="font-heading text-xl font-bold tracking-tight">{c.title}</h1>
          </TabsContent>
        ))}
      </main>
      <Footer />
    </Tabs>
  )
}
