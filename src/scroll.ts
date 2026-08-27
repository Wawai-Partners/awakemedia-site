/**
 * One scroll ticker for the whole page.
 *
 * Five components each had their own `scroll` listener and three of them ran
 * their own requestAnimationFrame loop on top. A trace of a single scroll pass
 * showed 255 scroll dispatches costing 315ms of main thread before any of the
 * actual work started: the dispatch overhead alone, multiplied by the number
 * of listeners.
 *
 * Everything scroll-driven now shares one rAF loop that reads `scrollY` once
 * per frame. There is no `scroll` listener at all: a per-frame read is what the
 * animation can actually use, and anything more often is thrown away before it
 * is ever painted.
 */

export type ScrollFrame = {
  /** window.scrollY for this frame. */
  y: number
  /** Viewport height, measured on resize rather than per frame. */
  vh: number
  /** Full scrollable height, measured on resize rather than per frame. */
  pageHeight: number
  /** False when the page has not moved since the previous frame. */
  moved: boolean
  /** Travel direction, held from the last actual movement. */
  direction: 'down' | 'up'
}

type Listener = (frame: ScrollFrame) => void

const listeners = new Set<Listener>()

let raf = 0
let lastY = -1
let direction: 'down' | 'up' = 'down'
let vh = 0
let pageHeight = 0
/**
 * Frames to keep ticking after the page stops moving. Several subscribers ease
 * toward a target and are still settling after the last movement; without a
 * tail they would freeze part-way there.
 */
const IDLE_FRAMES = 90
let idle = 0

/** Layout reads, kept out of the per-frame path. */
function measure() {
  vh = window.innerHeight
  pageHeight = document.documentElement.scrollHeight
}

function tick() {
  const y = window.scrollY
  const moved = y !== lastY
  if (moved) {
    if (lastY >= 0) direction = y > lastY ? 'down' : 'up'
    lastY = y
    idle = 0
  } else {
    idle += 1
  }

  const frame: ScrollFrame = { y, vh, pageHeight, moved, direction }
  for (const listener of listeners) listener(frame)

  // Park the loop once nothing has moved for a while. It restarts on the next
  // scroll or resize, so an idle tab is not burning a frame callback forever.
  if (idle > IDLE_FRAMES) {
    raf = 0
    return
  }
  raf = requestAnimationFrame(tick)
}

/** Restart the loop. Deliberately reads nothing: this runs per scroll event. */
function wake() {
  idle = 0
  if (!raf) raf = requestAnimationFrame(tick)
}

function remeasure() {
  measure()
  wake()
}

let bound = false

function bind() {
  if (bound || typeof window === 'undefined') return
  bound = true
  measure()
  // The only listeners on the page. `scroll` wakes the loop but does no work
  // itself, so its dispatch cost stays flat no matter how many subscribers
  // there are.
  window.addEventListener('scroll', wake, { passive: true })
  window.addEventListener('resize', remeasure)
  // The page height changes when a section's content reflows, not only on
  // resize, and progress is measured against it.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(remeasure).observe(document.documentElement)
  }
}

/** Subscribe to the shared loop. Returns an unsubscribe function. */
export function onScrollFrame(listener: Listener) {
  bind()
  listeners.add(listener)
  remeasure()
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Progress of an element's scroll runway, 0 to 1. `top`/`height` come from a
 * cached measurement rather than getBoundingClientRect, which forces a layout
 * every time it is read and was being read twice per frame.
 */
export function runwayProgress(top: number, height: number, y: number, vh: number) {
  const scrub = height - vh
  if (scrub <= 0) return 0
  return Math.min(1, Math.max(0, (y - top) / scrub))
}
