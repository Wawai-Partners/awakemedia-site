import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import { onScrollFrame, runwayProgress } from '../scroll'

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
  // `step` is one of eleven discrete values, so React owning it costs eleven
  // renders across the whole section. The exit ramp below is continuous and is
  // written straight to the node instead: as state it re-rendered the section
  // and its eleven stages on every single frame of the scroll.
  const [step, setStep] = useState(0)
  const sectionRef = useRef<HTMLElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)

  // Pin and scrub: the wheel is never intercepted, we only read where the page
  // already is, then map that onto which single item is on stage.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    // getBoundingClientRect forces a layout to answer and was being called
    // every frame. The section's own box only changes on resize, so measure it
    // there and derive progress from the shared frame's scrollY.
    let top = 0
    let height = 0
    const measure = () => {
      top = el.offsetTop
      height = el.offsetHeight
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)

    let lastStep = -1
    let lastExit = -1

    const unsubscribe = onScrollFrame(({ y, vh, moved }) => {
      if (!moved && lastStep >= 0) return
      const p = runwayProgress(top, height, y, vh)

      const stepped = Math.min(1, p / STEP_SPAN)
      const next = height - vh <= 0 ? 0 : Math.min(STEPS - 1, Math.floor(stepped * STEPS))
      if (next !== lastStep) {
        lastStep = next
        setStep(next)
      }

      const shell = shellRef.current
      if (!shell) return
      const exitT = Math.max(0, (p - STEP_SPAN) / (1 - STEP_SPAN))
      // Exact rather than quantised, so the ramp lands on precisely 0 and 1.
      // This still skips the whole of the rest of the page, where exitT is
      // pinned at 0 and writing the style again would only invalidate it.
      if (exitT === lastExit) return
      lastExit = exitT
      shell.style.opacity = String(1 - exitT)
      shell.style.transform = `translate3d(${-90 * exitT}px, ${-70 * exitT}px, 0) rotate(${-8 * exitT}deg) scale(${1 - 0.08 * exitT})`
      // Only ask for a layer while the ramp is actually running.
      shell.style.willChange = exitT > 0 && exitT < 1 ? 'transform, opacity' : ''
    })

    return () => {
      unsubscribe()
      observer.disconnect()
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

  return (
    // Tall on purpose: the extra height is the runway the items step along.
    <section ref={sectionRef} id="whats-included" className="relative h-[420vh] supports-[height:100svh]:h-[420svh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-10 px-5 pb-12 pt-header text-center supports-[height:100svh]:h-[100svh] sm:px-8 md:px-12 md:pb-16">
        {/* One fixed-height stage with every step stacked inside it, so swapping
            copy never shifts the CTA and rail below. */}
        <Reveal delay={120} className="w-full">
          {/* Exit is driven by scroll, not by an observer. The stage sits
              inside a pinned container, so it never actually leaves the
              viewport while the section is held: an IntersectionObserver can
              only fire once the sticky releases, which reads as a snap rather
              than a fade. The effect above ramps it over the reserved tail so
              the fade tracks the reader, and reverses on the way back up. */}
          <div
            ref={shellRef}
            className="relative mx-auto h-[360px] w-full max-w-5xl sm:h-[440px] lg:h-[410px]"
          >
            <div
              style={stageStyle(0)}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <h2 className="text-4xl font-bold leading-[1.08] tracking-normal text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
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
                  className="font-mono text-sm tracking-[0.15em] text-white/60 drop-shadow-md sm:text-base lg:text-lg"
                >
                  {item.index}
                </span>
                <h3 className="mt-3 text-2xl font-bold leading-[1.15] tracking-normal text-white drop-shadow-lg sm:text-4xl sm:leading-[1.1] md:text-5xl lg:text-6xl">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 drop-shadow-md sm:text-base md:text-lg lg:text-xl">
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
