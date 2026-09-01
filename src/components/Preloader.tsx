import { useEffect, useRef, useState } from 'react'
import { onLoadingProgress, watchFonts } from '../loading'

/**
 * Below this the overlay is more distracting than the wait it covers, so it is
 * held even once everything is in. On a repeat visit the clip is in the HTTP
 * cache and the whole thing is over in a couple of hundred milliseconds.
 */
const MIN_MS = 600

/**
 * And above this it leaves regardless. A preloader that waits for an asset that
 * is never coming is a page that never arrives; the site is perfectly usable
 * with the backdrop still warming up.
 */
const MAX_MS = 5000

/** Curtain travel. Matches Reveal's enter easing so the two read as one system. */
const EXIT_MS = 700
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export default function Preloader({ onReveal }: { onReveal: () => void }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const mountedAt = useRef(Date.now())
  const revealed = useRef(false)

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // Scroll is locked for the duration: there is nothing to scroll to yet, and a
  // page that moves under a cover it cannot see is disorienting.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    watchFonts()
    return onLoadingProgress(setProgress)
  }, [])

  // One place decides it is time to go, so the floor and the ceiling cannot
  // disagree and the reveal cannot fire twice.
  useEffect(() => {
    if (revealed.current) return

    const leave = () => {
      if (revealed.current) return
      revealed.current = true
      setLeaving(true)
      // Hand the page over as the curtain starts moving rather than after it
      // lands: the site's own entrance then plays into the gap it leaves, and
      // scroll is never left locked if the exit is interrupted.
      document.body.style.overflow = ''
      onReveal()
    }

    const ceiling = window.setTimeout(leave, Math.max(0, MAX_MS - (Date.now() - mountedAt.current)))

    let floor = 0
    if (progress >= 1) {
      floor = window.setTimeout(leave, Math.max(0, MIN_MS - (Date.now() - mountedAt.current)))
    }

    return () => {
      window.clearTimeout(ceiling)
      if (floor) window.clearTimeout(floor)
    }
  }, [progress, onReveal])

  useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => setGone(true), reducedMotion ? 0 : EXIT_MS)
    return () => window.clearTimeout(id)
  }, [leaving, reducedMotion])

  if (gone) return null

  const percent = Math.round(progress * 100)

  return (
    <div
      role="status"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-[#0a0a0a] px-6"
      style={{
        transform: leaving && !reducedMotion ? 'translate3d(0, -100%, 0)' : 'translate3d(0, 0, 0)',
        opacity: leaving && reducedMotion ? 0 : 1,
        transitionProperty: 'transform, opacity',
        transitionDuration: reducedMotion ? '200ms' : `${EXIT_MS}ms`,
        transitionTimingFunction: EASE,
        willChange: 'transform',
      }}
    >
      {/* The number changes many times a second; announcing each one is noise.
          One static line carries the state for a screen reader instead. */}
      <span className="sr-only">Loading</span>

      <img
        src={`${import.meta.env.BASE_URL}AMLOGO2022_03.png`}
        alt="Awake Media"
        className="h-12 w-auto sm:h-16 lg:h-20"
        style={{
          opacity: reducedMotion ? 1 : Math.min(1, 0.25 + progress * 1.4),
          transition: reducedMotion ? undefined : 'opacity 400ms linear',
        }}
      />

      <div aria-hidden="true" className="flex w-full max-w-xs flex-col gap-3">
        <div className="h-px w-full overflow-hidden bg-white/15">
          {/* scaleX, not width: a width animation lays out and paints every
              frame, where a transform stays on the compositor. */}
          <div
            className="h-px w-full origin-left bg-white"
            style={{
              transform: `scaleX(${progress})`,
              transitionProperty: 'transform',
              transitionDuration: reducedMotion ? '0ms' : '300ms',
              transitionTimingFunction: 'linear',
            }}
          />
        </div>

        <div className="flex items-baseline justify-between font-mono text-xs tracking-[0.2em] text-white/45">
          <span>AWAKE MEDIA</span>
          <span className="tabular-nums">{String(percent).padStart(3, '0')}</span>
        </div>
      </div>
    </div>
  )
}
