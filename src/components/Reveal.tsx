import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react'

/** Where a section's content enters from. `bottom` is a plain rise, no spin. */
export type RevealOrigin = 'top-left' | 'bottom-right' | 'bottom'

const RevealOriginContext = createContext<RevealOrigin>('top-left')

/**
 * Sets the entry corner for every Reveal inside it. Renders no DOM node, so it
 * will not disturb the `main > section` scroll-snap selector.
 */
export function RevealOriginProvider({
  origin,
  children,
}: {
  origin: RevealOrigin
  children: ReactNode
}) {
  return <RevealOriginContext.Provider value={origin}>{children}</RevealOriginContext.Provider>
}

type RevealProps = {
  children: ReactNode
  /** enter transition-delay in milliseconds (exit is never delayed) */
  delay?: number
  className?: string
  as?: ElementType
  /**
   * 'scroll' (default) ties visibility to the viewport. Use 'mount' for
   * position:fixed content: a fixed element that starts translated off-screen
   * never intersects, so it would deadlock: hidden because it is out of view,
   * out of view because it is hidden.
   */
  trigger?: 'scroll' | 'mount'
}

const ENTER_MS = 700
/** Exit runs at ~64% of enter so leaving feels responsive rather than draggy. */
const EXIT_MS = 450

/** Off-centre resting places. Mirrored so alternating sections feel deliberate. */
const OUT_TRANSFORM: Record<RevealOrigin, string> = {
  'top-left': 'translate3d(-90px, -70px, 0) rotate(-8deg) scale(0.92)',
  'bottom-right': 'translate3d(90px, 70px, 0) rotate(8deg) scale(0.92)',
  // Straight rise: deliberately no rotate/scale.
  bottom: 'translate3d(0, 56px, 0)',
}
const IN_TRANSFORM = 'translate3d(0, 0, 0) rotate(0deg) scale(1)'

/**
 * Content leaves in the direction the reader is travelling: scrolling down
 * spins it away to the top left, scrolling back up sends it to the bottom
 * right. One shared listener rather than one per Reveal, since there are
 * dozens on the page.
 */
let scrollDir: 'down' | 'up' = 'down'
let lastY = typeof window === 'undefined' ? 0 : window.scrollY
let listening = false

function watchScrollDirection() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY
      if (y !== lastY) {
        scrollDir = y > lastY ? 'down' : 'up'
        lastY = y
      }
    },
    { passive: true },
  )
}

const exitTransform = () =>
  scrollDir === 'down' ? OUT_TRANSFORM['top-left'] : OUT_TRANSFORM['bottom-right']

/** Springy settle without literal overshoot: overshoot would widen the box. */
const ENTER_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EXIT_EASE = 'cubic-bezier(0.4, 0, 1, 1)'

/**
 * Spins in from a corner toward centre, and retreats the same way on the way
 * out. IntersectionObserver at threshold 0.15, firing in both directions.
 * Honours prefers-reduced-motion by rendering content statically visible.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
  trigger = 'scroll',
}: RevealProps) {
  const origin = useContext(RevealOriginContext)
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  // Entry and exit share one hidden state, so they would otherwise be forced to
  // the same corner. Tracking "has it ever been on screen" lets the first
  // appearance keep the section's own origin while later exits follow travel.
  const [hasEntered, setHasEntered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    watchScrollDirection()
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (trigger === 'mount') {
      // Reveal on the next frame so the browser has a start value to animate from.
      const id = requestAnimationFrame(() => {
        setVisible(true)
        setHasEntered(true)
      })
      return () => cancelAnimationFrame(id)
    }

    const el = ref.current
    if (!el) return

    // Note: no unobserve: the element keeps reporting so it can animate back out.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting)
          if (entry.isIntersecting) setHasEntered(true)
        }
      },
      { threshold: 0.15 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [trigger])

  if (reducedMotion) {
    return (
      <Tag ref={ref} className={className}>
        {children}
      </Tag>
    )
  }

  const duration = visible ? ENTER_MS : EXIT_MS
  const easing = visible ? ENTER_EASE : EXIT_EASE
  const hidden = hasEntered ? exitTransform() : OUT_TRANSFORM[origin]

  return (
    <Tag
      ref={ref}
      style={{
        transform: visible ? IN_TRANSFORM : hidden,
        opacity: visible ? 1 : 0,
        // All longhands: mixing the `transition` shorthand with transitionDelay
        // makes React warn and lets the two clobber each other on re-render.
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: easing,
        // Stagger only on the way in; staggering the exit reads as sluggish.
        transitionDelay: visible ? `${delay}ms` : '0ms',
        willChange: 'transform, opacity',
      }}
      className={className}
    >
      {children}
    </Tag>
  )
}
