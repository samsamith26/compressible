import 'react'

declare module 'react' {
  interface CSSProperties {
    /** Particle spacing for the shock-tube drift animation. */
    readonly '--spacing'?: string
  }
}
