/** Logo: a ramp with an attached oblique shock. */
export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect width="32" height="32" rx="7" className="fill-ink" />
        <path d="M5 25 L27 25 L27 15 Z" className="fill-down" />
        <path d="M6 25 L22 7" className="stroke-up" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <div className="hidden leading-tight min-[480px]:block">
        <p className="text-[0.95rem] font-semibold tracking-tight">compressible</p>
        <p className="hidden text-xs text-muted sm:block">gas dynamics calculators</p>
      </div>
    </div>
  )
}
