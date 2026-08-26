import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import imgProductStrat from '../images/aN5_a55xUNkB1acx_01.ProductStrat.avif'
import imgAppWeb from '../images/aN5_bZ5xUNkB1acy_02.App&Web.avif'
import imgBrand from '../images/aN5_b55xUNkB1acz_03.Brand.avif'
import imgBiosciences from '../images/Integrated_Biosciences-176-2048x1366.jpg'

/** Four supplied images cycled across ten rows: see note in the handover. */
const IMAGES = [imgProductStrat, imgAppWeb, imgBrand, imgBiosciences]

const GAP = 8
/** Open panel takes this share of the row; the rest is the pile + next panel. */
const ACTIVE_SHARE = 0.55

/**
 * Geometry derived from the measured row width rather than fixed pixels. Fixed
 * values only fill the row at one viewport size: on a wide screen a hard-coded
 * pile left ~590px of dead space at the last item.
 *
 * peek = (rowW - activeW) / (n - 1) makes the arithmetic close at both ends:
 *   last item  -> pile (rowW - activeW) + activeW  = rowW
 *   first item -> activeW + GAP + collapsedW       = rowW
 * In between, upcoming panels run past the right edge, which is the intent.
 */
function geometry(rowW: number, count: number) {
  const activeW = Math.round(rowW * ACTIVE_SHARE)
  const collapsedW = Math.max(0, rowW - activeW - GAP)
  const peek = count > 1 ? (rowW - activeW) / (count - 1) : 0
  return { activeW, collapsedW, peek }
}

function offsetFor(i: number, active: number, g: ReturnType<typeof geometry>) {
  if (i <= active) return i * g.peek
  return active * g.peek + g.activeW + GAP + (i - active - 1) * (g.collapsedW + GAP)
}

function widthFor(i: number, active: number, g: ReturnType<typeof geometry>) {
  return i === active ? g.activeW : g.collapsedW
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Panel box at a fractional scroll position. Snapping to whole indices and
 * animating the gap with a 500ms transition made the strip move in eight
 * discrete lurches that always trailed the wheel. Interpolating between the
 * layout at floor(pos) and ceil(pos) tracks the scroll 1:1 instead.
 */
function boxAt(i: number, pos: number, g: ReturnType<typeof geometry>, count: number) {
  const lo = Math.max(0, Math.min(count - 1, Math.floor(pos)))
  const hi = Math.max(0, Math.min(count - 1, lo + 1))
  const t = pos - lo
  return {
    x: lerp(offsetFor(i, lo, g), offsetFor(i, hi, g), t),
    w: lerp(widthFor(i, lo, g), widthFor(i, hi, g), t),
  }
}

const WORK = [
  {
    index: '01',
    title: 'Logo Design',
    body: 'A mark that holds up at every size, favicon to banner, handed over with the source files so you are never locked out of your own brand.',
  },
  {
    index: '02',
    title: 'Podcast Brands & Episode Production',
    body: 'Cover art, intro beds and episode assembly. You record; we hand back something ready to publish.',
  },
  {
    index: '03',
    title: 'Web Design & Development',
    body: 'Design and build in one pass, so what you approve is what actually ships, with no redraw between the two.',
  },
  {
    index: '04',
    title: 'Content Creation',
    body: 'Copy, stills and graphics made for the channels you actually post to, not leftovers repurposed to fill a grid.',
  },
  {
    index: '05',
    title: 'Audio & Video Production',
    body: 'Shot, cut and mixed end to end, with the sound treated as carefully as the picture.',
  },
  {
    index: '06',
    title: 'eCommerce & Booking Systems',
    body: 'Carts, checkouts and calendars wired up and tested, so orders and appointments land somewhere you can act on them.',
  },
  {
    index: '07',
    title: 'Email & Social Media Marketing',
    body: 'Campaigns built on your own list and cadence, measured against what you sell rather than vanity counts.',
  },
  {
    index: '08',
    title: 'Filmmaking',
    body: 'Longer-form work from treatment through final grade, for when a short clip cannot carry the story.',
  },
]

export default function SectionWork() {
  const [pos, setPos] = useState(0)
  // The stacking layout only exists from lg. Tracked in JS because the offset
  // has to be a real inline transform value, not a CSS variable: `transition`
  // cannot interpolate a custom property, so a var-based transform freezes at
  // its first value.
  const [isWide, setIsWide] = useState(false)
  const [rowW, setRowW] = useState(0)
  const sectionRef = useRef<HTMLElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  // The row width drives every panel size, so it has to be measured, not assumed.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setRowW(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsWide(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  // Scroll drives the strip. This is pin-and-scrub, not scroll-jacking: the
  // wheel is never intercepted, we only read where the page already is.
  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrubDistance = rect.height - window.innerHeight
      if (scrubDistance <= 0) {
        setPos(0)
        return
      }
      const progress = Math.min(1, Math.max(0, -rect.top / scrubDistance))
      setPos(progress * (WORK.length - 1))
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
   * Click and keyboard focus scroll to the item instead of setting state
   * directly: scroll owns `active`, so setting it here would be overwritten by
   * the next scroll event and the control would appear broken.
   */
  const goTo = (index: number) => {
    const el = sectionRef.current
    if (!el) return
    const scrubDistance = el.offsetHeight - window.innerHeight
    if (scrubDistance <= 0) return
    // Aim at the middle of the item's band so it lands solidly on that item.
    const offset = (index / (WORK.length - 1)) * scrubDistance
    window.scrollTo({ top: el.offsetTop + offset })
  }

  const g = geometry(rowW, WORK.length)
  // Only place panels once the row has actually been measured.
  const placed = isWide && rowW > 0
  // Labels, aria and the rail read the nearest whole item.
  const active = Math.round(pos)

  return (
    // Tall on purpose: the extra height is the scroll runway that steps through
    // the eight items while the panel below stays pinned. ~50vh per item.
    <section ref={sectionRef} id="additional-services" className="relative h-[420vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center gap-8 px-5 pb-12 pt-24 supports-[height:100svh]:h-[100svh] sm:px-8 sm:pt-28 md:px-12 md:pb-16">
        {/* Heading left, supporting copy right. Stacks below lg, where there is
            no room to sit them side by side. */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <Reveal delay={180}>
            <h2 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-normal text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
              ADDITIONAL SERVICES AVAILABLE
            </h2>
          </Reveal>

          <Reveal delay={230} className="lg:max-w-md lg:shrink-0">
            <div className="space-y-3 text-sm leading-relaxed text-white/80 drop-shadow-md sm:text-base lg:text-right">
              <p>
                Additional digital media services are available through Awake Media at 30%
                discounted rates for Awake.net members.
              </p>
              <p>
                To order services directly visit AwakeMedia.com or after checkout you will be
                redirected to a page to collect details about your website where you can indicate
                which services you want.
              </p>
            </div>
          </Reveal>
        </div>

        {/* The glass panel must sit OUTSIDE Reveal: Reveal applies a transform
            and will-change, which makes it a backdrop root: backdrop-filter
            inside one can only sample its own group, so the blur was inert.
            Bleeds past the section padding on the right (-mr) with no right
            border or rounding, so the strip row reads as continuing off-screen
            instead of ending in a boundary. */}
        <div className="-mr-5 overflow-hidden rounded-l-2xl border-y border-l border-white/20 bg-white/5 p-2 backdrop-blur-md sm:-mr-8 md:-mr-12">
          <Reveal delay={280}>
            {/* Below lg: a plain vertical stack. From lg: each panel is placed
                by transform, so passed items pile up on the left instead of
                sliding away. */}
            <ul ref={listRef} className="flex h-auto flex-col gap-2 lg:relative lg:block lg:h-[520px]">
            {WORK.map((item, i) => {
              const open = active === i
              return (
                <li
                  key={item.index}
                  style={{
                    transform: placed ? `translateX(${boxAt(i, pos, g, WORK.length).x}px)` : undefined,
                    width: placed ? boxAt(i, pos, g, WORK.length).w : undefined,
                    // Later panels sit above earlier ones so the left-hand pile
                    // reads as a deck, newest card on top.
                    zIndex: i,
                  }}
                  className="relative min-h-[72px] overflow-hidden rounded-xl lg:absolute lg:left-0 lg:top-0 lg:h-full lg:min-h-0"
                >
                  <img
                    src={IMAGES[i % IMAGES.length]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Scrim: type sits directly on the photo, so it needs its own
                      ground rather than relying on the panel tint. */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      open
                        ? 'bg-gradient-to-t from-black/95 via-black/70 to-black/35'
                        : 'bg-black/70'
                    }`}
                  />

                  {/* A real button so touch and keyboard work too: hover alone
                      would leave this section inert on phones. */}
                  <button
                    type="button"
                    onFocus={() => goTo(i)}
                    onClick={() => goTo(i)}
                    // Not aria-expanded: nothing collapses any more: every
                    // description stays on screen: so this is "the current one
                    // of a set", which is what aria-current means.
                    aria-current={open}
                    // Collapsed strips get tighter padding: at lg:p-5 the content
                    // box is only ~89px and a 16px label overflows it.
                    className={`absolute inset-0 flex flex-col justify-end gap-2 overflow-hidden p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                      open ? 'lg:p-5' : 'lg:p-3'
                    }`}
                  >
                    <span
                      className={`font-mono tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-all duration-300 ${
                        open ? 'text-sm text-white lg:text-base' : 'text-sm text-white/85 lg:text-base'
                      }`}
                    >
                      {item.index}
                    </span>
                    {/* Panels are 560px wide now, so the title fits horizontally
                        again: the number-only compromise was only needed while
                        collapsed strips were ~44px. Stacked panels keep their
                        title too; the overlap simply clips it. */}
                    <span
                      className={`font-medium leading-snug tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
                        open ? 'text-lg lg:text-2xl' : 'text-base lg:text-lg'
                      }`}
                    >
                      {item.title}
                    </span>
                    <p
                      // Always shown. Panels are wide enough to carry it now, and
                      // the left-hand pile simply clips what it overlaps.
                      className="max-w-md text-sm leading-relaxed text-white/85 drop-shadow-md"
                    >
                      {item.body}
                    </p>
                  </button>
                </li>
              )
            })}
            </ul>
          </Reveal>
        </div>

        {/* Purple progress rail: the only cue that this section holds more than
            what is on screen, since the page scroll is what advances it. */}
        <div
          className="-mr-5 sm:-mr-8 md:-mr-12"
          role="progressbar"
          aria-label="Service list position"
          aria-valuemin={1}
          aria-valuemax={WORK.length}
          aria-valuenow={active + 1}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-violet-500"
              style={{ width: `${((pos + 1) / WORK.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
