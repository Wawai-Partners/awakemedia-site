import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react'
import { onScrollFrame } from '../scroll'

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
 * Phones get a calmer version of the same idea.
 *
 * The corner spin was authored for a mouse wheel on a wide screen. On a phone
 * the viewport is short enough that two or three of these run at once for most
 * of a scroll, and each one is a rotate and a scale, which the compositor
 * cannot serve from a cached layer the way it serves a straight translate: the
 * text is re-rastered for every frame of every transition. It also reads badly
 * under a finger, because content is still travelling after the page has
 * stopped.
 *
 * So: a short rise, no rotation, no scale, and nothing animates back out once
 * it has arrived. Wide screens keep the original choreography.
 */
const COMPACT_ENTER_MS = 420
const COMPACT_OUT = 'translate3d(0, 24px, 0)'
const COMPACT_BREAKPOINT = 768

function compactMotion() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < COMPACT_BREAKPOINT || window.matchMedia('(pointer: coarse)').matches
}

/**
 * Content leaves in the direction the reader is travelling: scrolling down
 * spins it away to the top left, scrolling back up sends it to the bottom
 * right. The direction rides the shared scroll ticker rather than a listener of
 * its own, so adding a Reveal costs nothing at scroll time.
 */
let scrollDir: 'down' | 'up' = 'down'
let watching = false

function watchScrollDirection() {
  if (watching || typeof window === 'undefined') return
  watching = true
  onScrollFrame(({ direction }) => {
    scrollDir = direction
  })
}

const exitTransform = () =>
  scrollDir === 'down' ? OUT_TRANSFORM['top-left'] : OUT_TRANSFORM['bottom-right']

/**
 * One IntersectionObserver for every Reveal on the page instead of one each.
 * Seventeen observers watching the same root at the same threshold is
 * seventeen sets of bookkeeping for information a single one already has.
 */
const callbacks = new WeakMap<Element, (visible: boolean) => void>()
let sharedObserver: IntersectionObserver | null = null

function observe(el: Element, onChange: (visible: boolean) => void) {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) callbacks.get(entry.target)?.(entry.isIntersecting)
      },
      { threshold: 0.15 },
    )
  }
  callbacks.set(el, onChange)
  sharedObserver.observe(el)
  return () => {
    callbacks.delete(el)
    sharedObserver?.unobserve(el)
  }
}

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
  const [compact, setCompact] = useState(compactMotion)

  useEffect(() => {
    watchScrollDirection()
  }, [])

  useEffect(() => {
    const sync = () => setCompact(compactMotion())
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
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

    // On wide screens it keeps reporting after entering, so it can animate
    // back out. On compact it unobserves on arrival: there is no exit to drive,
    // and an observer that can no longer change anything is pure overhead.
    let stop = () => {}
    let done = false
    stop = observe(el, (isVisible) => {
      if (compact) {
        if (!isVisible || done) return
        done = true
        setVisible(true)
        setHasEntered(true)
        stop()
        return
      }
      setVisible(isVisible)
      if (isVisible) setHasEntered(true)
    })
    return () => stop()
  }, [trigger, compact])

  /**
   * will-change is a promise to the compositor, not a hint to be left on: held
   * permanently on all seventeen Reveals it kept a layer alive for every one of
   * them for the life of the page. Ask for it while a transition is actually in
   * flight and hand it back afterwards.
   */
  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion) return
    const ms = compact
      ? COMPACT_ENTER_MS + (visible ? Math.round(delay * 0.45) : 0)
      : visible
        ? ENTER_MS + delay
        : EXIT_MS
    el.style.willChange = 'transform, opacity'
    const id = window.setTimeout(() => {
      el.style.willChange = ''
    }, ms + 60)
    return () => window.clearTimeout(id)
  }, [visible, delay, reducedMotion, compact])

  if (reducedMotion) {
    return (
      <Tag ref={ref} className={className}>
        {children}
      </Tag>
    )
  }

  const duration = compact ? COMPACT_ENTER_MS : visible ? ENTER_MS : EXIT_MS
  const easing = visible ? ENTER_EASE : EXIT_EASE
  const hidden = compact
    ? COMPACT_OUT
    : // A section that asked for the straight rise keeps it in both directions.
      origin === 'bottom'
      ? OUT_TRANSFORM.bottom
      : hasEntered
        ? exitTransform()
        : OUT_TRANSFORM[origin]
  // Staggering a whole section by 700ms is a long time to look at a blank
  // screen on a phone, where the section fills the viewport on its own.
  const enterDelay = compact ? Math.round(delay * 0.45) : delay

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
        transitionDelay: visible ? `${enterDelay}ms` : '0ms',
      }}
      className={className}
    >
      {children}
    </Tag>
  )
}
