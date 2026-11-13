export function Footer() {
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto max-w-[1200px] px-4 py-6 text-sm text-ink-2 sm:px-6">
        Inspired by the{' '}
        <a
          className="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
          href="https://devenport.aoe.vt.edu/aoe3114/calc.html"
          target="_blank"
          rel="noreferrer"
        >
          Virginia Tech Compressible Aerodynamics Calculator
        </a>
        . Perfect gas, angles in degrees.
      </div>
    </footer>
  )
}
