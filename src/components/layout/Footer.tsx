export function Footer() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-7xl border-t border-rule px-4 py-6 text-sm text-muted sm:px-6">
      <p>
        Inspired by the{' '}
        <a
          href="https://devenport.aoe.vt.edu/aoe3114/calc.html"
          className="text-ink underline decoration-rule underline-offset-4 hover:decoration-up"
          target="_blank"
          rel="noreferrer"
        >
          Virginia Tech Compressible Aerodynamics Calculator
        </a>{' '}
        by William Devenport. Calorically perfect gas; relations from Anderson, <cite>Modern Compressible Flow</cite>.
      </p>
    </footer>
  )
}
