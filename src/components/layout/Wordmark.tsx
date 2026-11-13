/** The porthole mark: a test-section window with a colour-schlieren shock. */
export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5 font-heading text-base font-bold tracking-tight text-ink">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="#070b10" stroke="var(--ink-2)" strokeWidth="1.5" />
        <path d="M6 24 L26 24 L26 15 Z" fill="#26313b" />
        <line x1="6" y1="24" x2="23" y2="6" stroke="#2f95d4" strokeWidth="3" strokeLinecap="round" />
        <line x1="7.5" y1="24" x2="24.5" y2="6" stroke="#e2609c" strokeWidth="2" strokeLinecap="round" />
        <line x1="6.8" y1="24" x2="23.8" y2="6" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline">Compressible</span>
    </span>
  )
}
