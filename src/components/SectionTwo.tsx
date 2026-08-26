import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'

const ITEMS = [
  {
    index: '01',
    title: 'Domain Name Registration',
    body: 'We register it and point it where it belongs, with no half-finished transfers left with you.',
  },
  {
    index: '02',
    title: 'Hosting Setup',
    body: 'Managed hosting configured before you ever log in. No server decisions land on your desk.',
  },
  {
    index: '03',
    title: 'Email Setup',
    body: 'Addresses on your own domain, tested so your mail lands in inboxes, not spam folders.',
  },
  {
    index: '04',
    title: 'WordPress pre-installed and ready for content',
    body: 'You arrive to a working site, not an empty install. Log in and start writing.',
  },
  {
    index: '05',
    title: 'Divi Premium Theme Pre-installed ($90 value)',
    body: 'Licensed and activated already, so a layout change never waits on a purchase.',
  },
  {
    index: '06',
    title: 'Security, back-up, analytics and site speed plugins pre-installed',
    body: 'Protected, backed up, measured and quick: configured for you, not merely installed.',
  },
  {
    index: '07',
    title: 'Contact Form & SMTP Activation for Deliverability',
    body: 'A form that actually reaches you, with mail authentication so enquiries stop vanishing.',
  },
  {
    index: '08',
    title: 'Video tutorial walk-through on how to edit content on your website',
    body: 'Short videos on editing your own pages, with no digging through forums for the right button.',
  },
  {
    index: '09',
    title: 'Ongoing Daily Website Updates and Maintenance',
    body: 'Core, theme and plugins updated every day, before a small issue becomes an outage.',
  },
  {
    index: '10',
    title: 'Access to Website is a Week Workshop Live or Video Tutorials',
    body: 'Join the workshop live or take it at your own pace on video, whichever fits your week.',
  },
]

/** Step 0 is the heading; steps 1 to 10 are the items. */
const STEPS = ITEMS.length + 1

/**
 * The steps occupy the first 88% of the runway; the last 12% is reserved for
 * the exit. Without that reserve the final item would start fading the moment
 * it appeared.
 */
const STEP_SPAN = 0.88

export default function SectionTwo() {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const sectionRef = useRef<HTMLElement | null>(null)

  // Pin and scrub: the wheel is never intercepted, we only read where the page
  // already is, then map that onto which single item is on stage.
  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrub = rect.height - window.innerHeight
      if (scrub <= 0) {
        setStep(0)
        setProgress(0)
        return
      }
      const p = Math.min(1, Math.max(0, -rect.top / scrub))
      setProgress(p)
      const stepped = Math.min(1, p / STEP_SPAN)
      setStep(Math.min(STEPS - 1, Math.floor(stepped * STEPS)))
    }

    // One read per frame: scroll fires far more often than the screen repaints.
    const sync = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  /**
   * Every step stays mounted so a screen reader still receives all ten items in
   * order; only one is visible at a time. Steps already passed leave upward and
   * steps still ahead wait below, so the swap reads as forward travel.
   */
  const stageStyle = (i: number) => {
    const delta = i - step
    return {
      opacity: delta === 0 ? 1 : 0,
      transform: delta === 0 ? 'translateY(0)' : `translateY(${delta < 0 ? -28 : 28}px)`,
      transitionProperty: 'opacity, transform',
      transitionDuration: '420ms',
      transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      pointerEvents: 'none' as const,
    }
  }

  /**
   * Exit is driven by scroll, not by an observer. The stage sits inside a pinned
   * container, so it never actually leaves the viewport while the section is
   * held: an IntersectionObserver can only fire once the sticky releases, which
   * reads as a snap rather than a fade. Ramping it over the reserved tail ties
   * the fade to where the reader is, and reverses on the way back up.
   */
  const exitT = Math.max(0, (progress - STEP_SPAN) / (1 - STEP_SPAN))
  const stageShell = {
    opacity: 1 - exitT,
    transform: `translate3d(${-90 * exitT}px, ${-70 * exitT}px, 0) rotate(${-8 * exitT}deg) scale(${1 - 0.08 * exitT})`,
    willChange: 'transform, opacity',
  }

  return (
    // Tall on purpose: the extra height is the runway the items step along.
    <section ref={sectionRef} id="whats-included" className="relative h-[420vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-10 px-5 pb-12 pt-24 text-center supports-[height:100svh]:h-[100svh] sm:px-8 sm:pt-28 md:px-12 md:pb-16">
        {/* One fixed-height stage with every step stacked inside it, so swapping
            copy never shifts the CTA and rail below. */}
        <Reveal delay={120} className="w-full">
          <div
            style={stageShell}
            className="relative mx-auto h-[440px] w-full max-w-5xl sm:h-[410px]"
          >
            <div
              style={stageStyle(0)}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <h2 className="text-5xl font-bold leading-[1.08] tracking-normal text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
                WHAT&rsquo;S INCLUDED
              </h2>
            </div>

            {ITEMS.map((item, i) => (
              <div
                key={item.index}
                style={stageStyle(i + 1)}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-base tracking-[0.15em] text-white/60 drop-shadow-md lg:text-lg"
                >
                  {item.index}
                </span>
                <h3 className="mt-3 text-4xl font-bold leading-[1.1] tracking-normal text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 drop-shadow-md sm:text-lg lg:text-xl">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

      </div>
    </section>
  )
}
