import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CALCULATORS } from '@/lib/calculators'
import { ThemeToggle } from './ThemeToggle'
import { Wordmark } from './Wordmark'

/** Must render inside the app's <Tabs> root. */
export function Header() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-2 sm:gap-8 sm:px-6">
        <Wordmark />
        <TabsList variant="line" aria-label="Calculator" className="h-10 min-w-0 flex-1 justify-start gap-0 sm:gap-2">
          {CALCULATORS.map((c) => (
            <TabsTrigger key={c.id} value={c.id} className="flex-none px-2 text-sm sm:px-3 sm:text-base">
              <span className="sm:hidden">{c.short}</span>
              <span className="hidden sm:inline">{c.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <ThemeToggle />
      </div>
    </header>
  )
}
