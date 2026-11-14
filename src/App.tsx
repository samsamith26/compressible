import type { ReactElement } from 'react'
import { Footer } from '@/components/layout/Footer'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Wordmark } from '@/components/layout/Wordmark'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InletCalculator } from '@/features/inlet/InletCalculator'
import { IsentropicCalculator } from '@/features/isentropic/IsentropicCalculator'
import { NormalShockCalculator } from '@/features/normal-shock/NormalShockCalculator'
import { ObliqueCalculator } from '@/features/oblique-shock/ObliqueCalculator'
import { CALCULATORS, useCalculatorTab, type CalculatorId } from '@/hooks/useCalculatorTab'

const VIEWS: Readonly<Record<CalculatorId, () => ReactElement>> = {
  isentropic: IsentropicCalculator,
  normal: NormalShockCalculator,
  oblique: ObliqueCalculator,
  inlet: InletCalculator,
}

export function App() {
  const [tab, setTab] = useCalculatorTab()

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-rule bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
          <Wordmark />
          <TabsList aria-label="Calculator" className="-mb-px min-w-0 flex-1">
            {CALCULATORS.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                <span className="sm:hidden">{c.short}</span>
                <span className="hidden sm:inline">{c.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-6 sm:pt-8">
        {CALCULATORS.map((c) => {
          const View = VIEWS[c.id]
          return (
            <TabsContent key={c.id} value={c.id}>
              <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
              <View />
            </TabsContent>
          )
        })}
      </main>
      <Footer />
    </Tabs>
  )
}
